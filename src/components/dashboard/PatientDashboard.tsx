import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Calendar, List, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";
import { ChatAssistant } from "@/components/chat/ChatAssistant";

export const PatientDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"calendar" | "list" | "chat">("calendar");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Mi Portal - BondusySpa</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === "calendar" ? "default" : "ghost"}
              onClick={() => setActiveTab("calendar")}
              className="rounded-b-none"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Cita
            </Button>
            <Button
              variant={activeTab === "list" ? "default" : "ghost"}
              onClick={() => setActiveTab("list")}
              className="rounded-b-none"
            >
              <List className="mr-2 h-4 w-4" />
              Mis Citas
            </Button>
            <Button
              variant={activeTab === "chat" ? "default" : "ghost"}
              onClick={() => setActiveTab("chat")}
              className="rounded-b-none"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Consultas
            </Button>
          </div>
        </div>

        {activeTab === "calendar" && <AppointmentCalendar />}
        {activeTab === "list" && <AppointmentsList />}
        {activeTab === "chat" && <ChatAssistant />}
      </main>
    </div>
  );
};