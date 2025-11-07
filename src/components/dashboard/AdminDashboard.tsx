import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Calendar, Users, MessageSquare, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";
import { ChatAssistant } from "@/components/chat/ChatAssistant";
import { StatisticsDashboard } from "@/components/dashboard/StatisticsDashboard";
import "./admin-dashboard.css";

// Importar las interfaces
import type { Appointment } from "@/components/appointments/AppointmentsList";
import type { RescheduleAppointment } from "@/components/appointments/AppointmentCalendar";

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"calendar" | "list" | "chat" | "stats">("stats");
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [rescheduleData, setRescheduleData] = useState<RescheduleAppointment | null>(null); // Estado para datos de reprogramación

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          status,
          profiles!inner(id)
        `);

      if (error) throw error;

      if (appointments) {
        setStats({
          total: appointments.length,
          pending: appointments.filter(a => a.status === "pending").length,
          confirmed: appointments.filter(a => a.status === "confirmed").length,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Error al cargar estadísticas");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate("/auth");
  };

  // Función para manejar la reprogramación
  const handleReschedule = (appointment: Appointment) => {
    // Convertir el objeto Appointment al formato RescheduleAppointment
    const rescheduleAppointment: RescheduleAppointment = {
      id: appointment.id,
      appointment_date: appointment.appointment_date,
      procedures: appointment.procedures,
      notes: appointment.notes
    };
    setRescheduleData(rescheduleAppointment);
    setActiveTab("calendar");
  };

  // Función para completar la reprogramación
  const handleRescheduleComplete = () => {
    setRescheduleData(null);
    setActiveTab("list");
    fetchStats();
  };

  return (
    <div className="admin-dashboard-container">
      <header className="admin-header">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Panel Administrativo - BondusySpa</h1>
          <Button variant="outline" onClick={handleLogout} className="btn-animated">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="stats-grid">
          <Card className="stat-card">
            <CardHeader className="stat-card-content pb-3">
              <CardTitle className="stat-title">Total Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardHeader className="stat-card-content pb-3">
              <CardTitle className="stat-title">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardHeader className="stat-card-content pb-3">
              <CardTitle className="stat-title">Confirmadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{stats.confirmed}</div>
            </CardContent>
          </Card>
        </div>

        <div className="tab-navigation">
          <Button
            variant={activeTab === "stats" ? "default" : "ghost"}
            onClick={() => setActiveTab("stats")}
            className={`tab-button ${activeTab === "stats" ? "active" : ""}`}
          >
            <BarChart3 className="tab-icon h-4 w-4" />
            Estadísticas
          </Button>
          <Button
            variant={activeTab === "calendar" ? "default" : "ghost"}
            onClick={() => setActiveTab("calendar")}
            className={`tab-button ${activeTab === "calendar" ? "active" : ""}`}
          >
            <Calendar className="tab-icon h-4 w-4" />
            Calendario
          </Button>
          <Button
            variant={activeTab === "list" ? "default" : "ghost"}
            onClick={() => setActiveTab("list")}
            className={`tab-button ${activeTab === "list" ? "active" : ""}`}
          >
            <Users className="tab-icon h-4 w-4" />
            Lista de Citas
          </Button>
          <Button
            variant={activeTab === "chat" ? "default" : "ghost"}
            onClick={() => setActiveTab("chat")}
            className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
          >
            <MessageSquare className="tab-icon h-4 w-4" />
            Asistente
          </Button>
        </div>

        <div className="content-section">
          {activeTab === "stats" && <StatisticsDashboard />}
          {activeTab === "calendar" && (
            <AppointmentCalendar 
              isAdmin 
              rescheduleData={rescheduleData || undefined}
              onRescheduleComplete={handleRescheduleComplete}
            />
          )}
          {activeTab === "list" && (
            <AppointmentsList 
              isAdmin 
              onUpdate={fetchStats} 
              onReschedule={handleReschedule}
            />
          )}
          {activeTab === "chat" && <ChatAssistant />}
        </div>
      </main>
    </div>
  );
};