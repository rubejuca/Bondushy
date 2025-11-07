import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Scissors, FileText } from "lucide-react";

interface Procedure {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
}

// Modificar interfaz para cita a reprogramar para que sea compatible con Appointment
export interface RescheduleAppointment {
  id: string;
  appointment_date: string;
  // Cambiar procedure_id por procedures con la estructura correcta
  procedures: {
    name: string;
    price: number | null;
  } | null;
  notes: string | null;
}

interface AppointmentCalendarProps {
  isAdmin?: boolean;
  rescheduleData?: RescheduleAppointment | null; // Agregar prop para datos de reprogramación
  onRescheduleComplete?: () => void; // Agregar callback para cuando se complete la reprogramación
}

export const AppointmentCalendar = ({ 
  isAdmin = false, 
  rescheduleData = null,
  onRescheduleComplete
}: AppointmentCalendarProps) => {
  const [date, setDate] = useState<Date | undefined>(rescheduleData ? new Date(rescheduleData.appointment_date) : new Date());
  const [selectedTime, setSelectedTime] = useState<string>(rescheduleData ? format(new Date(rescheduleData.appointment_date), "HH:mm") : "");
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<string>("");
  const [notes, setNotes] = useState<string>(rescheduleData ? rescheduleData.notes || "" : "");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // Modificar el efecto para cargar los procedimientos y seleccionar el correcto
  useEffect(() => {
    fetchProcedures();
  }, []);

  // Efecto para actualizar el estado cuando cambian los datos de reprogramación
  useEffect(() => {
    if (rescheduleData) {
      setDate(new Date(rescheduleData.appointment_date));
      setSelectedTime(format(new Date(rescheduleData.appointment_date), "HH:mm"));
      setNotes(rescheduleData.notes || "");
    }
  }, [rescheduleData]);

  // Efecto para seleccionar el procedimiento cuando se cargan los procedimientos
  useEffect(() => {
    if (rescheduleData && procedures.length > 0 && rescheduleData.procedures) {
      const matchingProcedure = procedures.find(proc => proc.name === rescheduleData.procedures?.name);
      if (matchingProcedure) {
        setSelectedProcedure(matchingProcedure.id);
      }
    }
  }, [procedures, rescheduleData]);

  useEffect(() => {
    if (date) {
      fetchBookedSlots();
    }
  }, [date]);

  const fetchProcedures = async () => {
    const { data } = await supabase
      .from("procedures")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (data) setProcedures(data);
  };

  const fetchBookedSlots = async () => {
    if (!date) return;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("appointments")
      .select("appointment_date")
      .gte("appointment_date", startOfDay.toISOString())
      .lte("appointment_date", endOfDay.toISOString())
      .in("status", ["pending", "confirmed"]);

    if (data) {
      const slots = data.map(apt => {
        const date = new Date(apt.appointment_date);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      });
      setBookedSlots(slots);
    }
  };

  const handleBookAppointment = async () => {
    if (!date || !selectedTime || !selectedProcedure) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Debes iniciar sesión");
        return;
      }

      const [hours, minutes] = selectedTime.split(":");
      const appointmentDate = new Date(date);
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Si estamos reprogramando una cita existente
      if (rescheduleData) {
        // Primero cancelamos la cita original
        const { error: cancelError } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", rescheduleData.id);

        if (cancelError) throw cancelError;

        // Luego creamos una nueva cita con los datos actualizados
        const { error: insertError } = await supabase
          .from("appointments")
          .insert({
            patient_id: user.id,
            procedure_id: selectedProcedure,
            appointment_date: appointmentDate.toISOString(),
            notes: notes || null,
            status: "pending"
          });

        if (insertError) throw insertError;

        // Notificar a todos los clientes para refrescar las citas
        const refreshChannel = supabase.channel('appointments-refetch');
        refreshChannel.send({
          type: 'broadcast',
          event: 'refresh_appointments',
          payload: {}
        });

        toast.success("¡Cita reprogramada exitosamente!");
        
        // Limpiar los datos de reprogramación
        if (onRescheduleComplete) {
          onRescheduleComplete();
        }
      } else {
        // Crear una nueva cita normalmente
        const { error } = await supabase
          .from("appointments")
          .insert({
            patient_id: user.id,
            procedure_id: selectedProcedure,
            appointment_date: appointmentDate.toISOString(),
            notes: notes || null,
            status: "pending"
          });

        if (error) throw error;

        // Enviar correo de confirmación usando fetch directo
        const response = await fetch("https://bnankphxrceakdazrhbs.functions.supabase.co/resend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuYW5rcGh4cmNlYWtkYXpyaGJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3NzMzMiwiZXhwIjoyMDc3MTUzMzMyfQ.zbd0-VbI0lWH3LJQLy5AVSLfvvk67ORR6SmY6Vp7-SE", 
          },
          body: JSON.stringify({
            to: user.email,
            subject: "Confirmación de cita - Bondushy Spa",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirmación de Cita - Bondushy Spa</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f0f2; color: #5a3a41;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f0f2; padding: 20px 0;">
                  <tr>
                    <td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #f8c6d6 0%, #fbd4e0 100%); color: #5a3a41; padding: 30px 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 0.5px;">¡Bienvenido a Bondushy Spa!</h1>
                            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9; font-weight: 500;">Tu bienestar es nuestra prioridad</p>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 30px; text-align: center;">
                            <h2 style="color: #f195b2; font-size: 24px; margin-bottom: 20px; font-weight: bold;">¡Tu cita fue agendada con éxito!</h2>
                            
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Gracias por elegir Bondushy Spa. Estamos emocionados de brindarte una experiencia única de bienestar y relajación.</p>
                            
                            <!-- Detalles de la cita -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5d6df; border-left: 4px solid #f195b2; padding: 20px; margin: 25px 0; border-radius: 0 10px 10px 0; text-align: left;">
                              <tr>
                                <td>
                                  <h3 style="color: #f195b2; margin-top: 0; font-weight: bold;">Detalles de tu cita:</h3>
                                  <p style="margin-bottom: 5px;"><strong>Fecha:</strong> ${date?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                  <p style="margin-bottom: 5px;"><strong>Hora:</strong> ${selectedTime}</p>
                                  <p style="margin-bottom: 5px;"><strong>Procedimiento:</strong> ${procedures.find(p => p.id === selectedProcedure)?.name}</p>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Te esperamos para brindarte el mejor servicio. Si necesitas hacer cambios en tu cita, no dudes en contactarnos.</p>
                            
                            <!-- Botón -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                              <tr>
                                <td align="center">
                                  <a href="#" style="display: inline-block; background: linear-gradient(135deg, #f8c6d6 0%, #fbd4e0 100%); color: #5a3a41; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; box-shadow: 0 5px 15px rgba(241, 149, 178, 0.3); border: 2px solid #f195b2;">Ver detalles de mi cita</a>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="margin-top: 20px; font-style: italic; color: #f195b2; font-weight: 600;">Con amor,<br>El equipo de Bondushy Spa 💅✨</p>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #f7e6eb; padding: 20px; text-align: center; border-top: 1px solid #f0d4db; font-size: 14px; color: #a57d87;">
                            <p style="margin: 0;">© 2025 Bondushy Spa. Todos los derechos reservados.</p>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 15px 0;">
                              <tr>
                                <td align="center">
                                  <a href="#" style="display: inline-block; margin: 0 10px; color: #f195b2; text-decoration: none; font-size: 18px;">📱</a>
                                  <a href="#" style="display: inline-block; margin: 0 10px; color: #f195b2; text-decoration: none; font-size: 18px;">📷</a>
                                  <a href="#" style="display: inline-block; margin: 0 10px; color: #f195b2; text-decoration: none; font-size: 18px;">📘</a>
                                </td>
                              </tr>
                            </table>
                            <p style="margin: 0;">Ibagué Tolima - Cucuta Norte Santander</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error enviando correo:", errorData);
        } else {
          const data = await response.json();
          console.log("Correo enviado:", data);
        }

        toast.success("¡Cita agendada exitosamente!");
      }

      setSelectedTime("");
      setSelectedProcedure("");
      setNotes("");
      fetchBookedSlots();
    } catch (error) {
      toast.error((error as Error).message || "Error al agendar la cita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Mostrar mensaje si estamos reprogramando */}
      {rescheduleData && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p className="font-medium">Reprogramando cita</p>
          <p>Selecciona una nueva fecha y hora para tu cita.</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Selecciona una Fecha
            </CardTitle>
            <CardDescription>Elige el día para tu cita</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date < new Date()}
              locale={es}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Scissors className="h-5 w-5 text-primary" />
              Detalles de la Cita
            </CardTitle>
            <CardDescription>
              {date ? format(date, "PPPP", { locale: es }) : "Selecciona una fecha"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Procedimiento
              </Label>
              <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un procedimiento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id}>
                      {proc.name} - ${proc.price} ({proc.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horario
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!date}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem 
                      key={time} 
                      value={time}
                      disabled={bookedSlots.includes(time)}
                    >
                      {time} {bookedSlots.includes(time) ? "(Ocupado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas adicionales (opcional)
              </Label>
              <Textarea
                placeholder="Alergias, preferencias, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleBookAppointment} 
              disabled={loading || !date || !selectedTime || !selectedProcedure}
              className="w-full"
            >
              {loading ? "Agendando..." : "Agendar Cita"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};