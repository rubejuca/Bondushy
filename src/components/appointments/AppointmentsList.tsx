import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, User, FileText, Filter } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Procedure {
  name: string;
  price: number | null;
}

interface Profile {
  full_name: string;
  email: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  procedures: Procedure | null;
  profiles: Profile | null;
}

interface AppointmentsListProps {
  isAdmin?: boolean;
  onUpdate?: () => void;
}

const statusOptions = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" }
] as const;

type StatusFilter = typeof statusOptions[number]["value"];

export const AppointmentsList = ({ isAdmin = false, onUpdate }: AppointmentsListProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchAppointments();
          onUpdate?.();
        }
      )
      .on(
        'broadcast',
        { event: 'refresh_appointments' },
        () => {
          fetchAppointments();
          onUpdate?.();
        }
      )
      .subscribe();

    // Canal para notificaciones de cambios en citas
    const notificationChannel = supabase
      .channel('appointment-notifications')
      .on(
        'broadcast',
        { event: 'appointment_status_changed' },
        (payload) => {
          const { patientId, procedureName, newStatus } = payload.payload;
          
          // Verificamos si la notificación es para el usuario actual
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && user.id === patientId) {
              // Mostramos mensaje según el nuevo estado
              const statusMessages: Record<string, string> = {
                confirmed: `¡Tu cita para ${procedureName} ha sido confirmada!`,
                cancelled: `Tu cita para ${procedureName} ha sido cancelada.`,
                completed: `Tu cita para ${procedureName} ha sido marcada como completada.`
              };
              
              const message = statusMessages[newStatus] || `El estado de tu cita para ${procedureName} ha cambiado.`;
              toast.success(message);
              
              // Actualizamos la lista de citas
              fetchAppointments();
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
    };
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      let query = supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          notes,
          procedures(name, price),
          profiles(full_name, email)
        `)
        .order("appointment_date", { ascending: true });

      if (!isAdmin) {
        query = query.eq("patient_id", user.id);
      }

      // Aplicar filtro por estado
      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Error al cargar citas");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: "pending" | "confirmed" | "completed" | "cancelled") => {
    try {
      // Primero obtenemos la cita actual para tener la información del usuario
      const { data: appointmentData, error: fetchError } = await supabase
        .from("appointments")
        .select(`
          patient_id,
          status,
          procedures(name)
        `)
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Actualizamos el estado de la cita
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", id);

      if (updateError) throw updateError;

      // Enviamos notificación al usuario que hizo la cita sobre el cambio de estado
      const channel = supabase.channel('appointment-notification');
      channel.send({
        type: 'broadcast',
        event: 'appointment_status_changed',
        payload: {
          appointmentId: id,
          patientId: appointmentData.patient_id,
          procedureName: appointmentData.procedures?.name || 'Procedimiento',
          newStatus: newStatus
        }
      });
      
      // Enviamos notificación para refrescar las citas en todos los clientes
      const refreshChannel = supabase.channel('appointments-refetch');
      refreshChannel.send({
        type: 'broadcast',
        event: 'refresh_appointments',
        payload: {}
      });

      toast.success("Estado actualizado");
      fetchAppointments();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("Error al actualizar");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive"
    };

    const labels: Record<string, string> = {
      pending: "Pendiente",
      confirmed: "Confirmada",
      completed: "Completada",
      cancelled: "Cancelada"
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Cargando citas...</div>;
  }

  // Mostrar filtros solo para administradores
  const showFilters = isAdmin;

  return (
    <div className="space-y-4">
      {/* Filtros - solo para administradores */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrar por estado:</span>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(option.value)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isAdmin 
              ? `No hay citas ${filter !== "all" ? `con estado "${statusOptions.find(opt => opt.value === filter)?.label}"` : "programadas por los usuarios"}`
              : "No tienes citas programadas"
            }
          </CardContent>
        </Card>
      ) : (
        appointments.map((apt) => (
          <Card key={apt.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{apt.procedures?.name || 'Procedimiento no especificado'}</CardTitle>
                  {isAdmin && (
                    <div className="flex flex-col text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <User className="mr-1 h-3 w-3" />
                        <span className="font-medium">Usuario:</span>
                      </div>
                      <div className="ml-4">
                        <div>{apt.profiles?.full_name || 'Nombre no disponible'}</div>
                        <div className="text-xs">{apt.profiles?.email || 'Email no disponible'}</div>
                        {!apt.profiles && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Nota: El perfil de este usuario puede estar incompleto
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {getStatusBadge(apt.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                {format(new Date(apt.appointment_date), "PPPP", { locale: es })}
              </div>
              <div className="flex items-center text-sm">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                {format(new Date(apt.appointment_date), "p", { locale: es })}
              </div>
              {apt.notes && (
                <div className="flex items-start text-sm">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{apt.notes}</span>
                </div>
              )}
              
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  {apt.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(apt.id, "confirmed")}
                        variant="default"
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(apt.id, "cancelled")}
                        variant="destructive"
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  {apt.status === "confirmed" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(apt.id, "completed")}
                      variant="outline"
                    >
                      Marcar como Atendida
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};