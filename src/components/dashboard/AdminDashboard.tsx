import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Calendar, Users, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";
import { ChatAssistant } from "@/components/chat/ChatAssistant";

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"calendar" | "list" | "chat">("calendar");
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 });

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Panel Administrativo - BondusySpa</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent-foreground">{stats.confirmed}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === "calendar" ? "default" : "ghost"}
              onClick={() => setActiveTab("calendar")}
              className="rounded-b-none"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendario
            </Button>
            <Button
              variant={activeTab === "list" ? "default" : "ghost"}
              onClick={() => setActiveTab("list")}
              className="rounded-b-none"
            >
              <Users className="mr-2 h-4 w-4" />
              Lista de Citas
            </Button>
            <Button
              variant={activeTab === "chat" ? "default" : "ghost"}
              onClick={() => setActiveTab("chat")}
              className="rounded-b-none"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Asistente
            </Button>
          </div>
        </div>

        {activeTab === "calendar" && <AppointmentCalendar isAdmin />}
        {activeTab === "list" && <AppointmentsList isAdmin onUpdate={fetchStats} />}
        {activeTab === "chat" && <ChatAssistant />}
      </main>
    </div>
  );
};