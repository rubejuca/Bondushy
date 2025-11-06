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

interface AppointmentCalendarProps {
  isAdmin?: boolean;
}

export const AppointmentCalendar = ({ isAdmin = false }: AppointmentCalendarProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  useEffect(() => {
    fetchProcedures();
  }, []);

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
            <h2>¡Tu cita fue agendada con éxito!</h2>
            <p>Gracias por elegir Bondushy Spa 💅</p>
            <p>Nos vemos pronto.</p>
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