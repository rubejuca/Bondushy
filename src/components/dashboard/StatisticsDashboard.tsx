import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  XCircle,
  UserCheck,
  CalendarDays
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { es } from "date-fns/locale";

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  procedures: {
    name: string;
    price: number | null;
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

interface ProcedureStats {
  name: string;
  count: number;
  revenue: number;
}

interface DailyStats {
  date: string;
  count: number;
  revenue: number;
}

interface MonthlyStats {
  month: string;
  count: number;
  revenue: number;
}

const COLORS = ["#FF6B8B", "#FF8E53", "#4A90E2", "#50C878", "#9370DB", "#FFD700"];

export const StatisticsDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  // Estadísticas generales
  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(a => a.status === "confirmed").length;
  const completedAppointments = appointments.filter(a => a.status === "completed").length;
  const pendingAppointments = appointments.filter(a => a.status === "pending").length;
  const cancelledAppointments = appointments.filter(a => a.status === "cancelled").length;
  
  // Ganancias totales
  const totalRevenue = appointments
    .filter(a => a.status === "confirmed" || a.status === "completed")
    .reduce((sum, apt) => sum + (apt.procedures?.price || 0), 0);

  // Estadísticas por procedimiento
  const procedureStats: ProcedureStats[] = appointments
    .filter(a => a.status === "confirmed" || a.status === "completed")
    .reduce((acc: ProcedureStats[], apt) => {
      const procedureName = apt.procedures?.name || "Sin especificar";
      const price = apt.procedures?.price || 0;
      const existing = acc.find(p => p.name === procedureName);
      
      if (existing) {
        existing.count += 1;
        existing.revenue += price;
      } else {
        acc.push({
          name: procedureName,
          count: 1,
          revenue: price
        });
      }
      
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count);

  // Estadísticas diarias
  const dailyStats: DailyStats[] = (() => {
    const endDate = new Date();
    const startDate = timeRange === "week" 
      ? subDays(endDate, 7) 
      : timeRange === "month" 
        ? subDays(endDate, 30) 
        : subDays(endDate, 365);
    
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dates.map(date => {
      const dateString = format(date, "yyyy-MM-dd");
      const dayAppointments = appointments.filter(apt => 
        format(new Date(apt.appointment_date), "yyyy-MM-dd") === dateString
      );
      
      const count = dayAppointments.length;
      const revenue = dayAppointments
        .filter(a => a.status === "confirmed" || a.status === "completed")
        .reduce((sum, apt) => sum + (apt.procedures?.price || 0), 0);
      
      return {
        date: format(date, "dd/MM", { locale: es }),
        count,
        revenue
      };
    });
  })();

  // Estadísticas mensuales
  const monthlyStats: MonthlyStats[] = (() => {
    if (timeRange !== "year") return [];
    
    const endDate = new Date();
    const startDate = subMonths(endDate, 11);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    return months.map(month => {
      const monthString = format(month, "yyyy-MM");
      const monthAppointments = appointments.filter(apt => 
        format(new Date(apt.appointment_date), "yyyy-MM") === monthString
      );
      
      const count = monthAppointments.length;
      const revenue = monthAppointments
        .filter(a => a.status === "confirmed" || a.status === "completed")
        .reduce((sum, apt) => sum + (apt.procedures?.price || 0), 0);
      
      return {
        month: format(month, "MMM", { locale: es }),
        count,
        revenue
      };
    });
  })();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          procedures(name, price),
          profiles(full_name)
        `)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      if (data) setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{totalAppointments}</div>
            <p className="text-xs text-blue-600">Todas las citas programadas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancias</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-green-600">Ingresos totales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">{confirmedAppointments}</div>
            <p className="text-xs text-purple-600">Citas confirmadas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <UserCheck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">{completedAppointments}</div>
            <p className="text-xs text-orange-600">Citas atendidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Controles de rango de tiempo */}
      <div className="flex justify-center gap-2">
        <Badge 
          variant={timeRange === "week" ? "default" : "secondary"} 
          className="cursor-pointer"
          onClick={() => setTimeRange("week")}
        >
          Última semana
        </Badge>
        <Badge 
          variant={timeRange === "month" ? "default" : "secondary"} 
          className="cursor-pointer"
          onClick={() => setTimeRange("month")}
        >
          Último mes
        </Badge>
        <Badge 
          variant={timeRange === "year" ? "default" : "secondary"} 
          className="cursor-pointer"
          onClick={() => setTimeRange("year")}
        >
          Último año
        </Badge>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de citas diarias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Citas por día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, "Citas"]}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#4A90E2" 
                  fill="#4A90E2" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de ingresos diarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Ingresos por día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${value}`, "Ingresos"]}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Bar dataKey="revenue" fill="#50C878" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de procedimientos más populares */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Procedimientos Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={procedureStats.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {procedureStats.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Citas"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de ingresos por procedimiento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ingresos por Procedimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={procedureStats.slice(0, 5)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value) => [`$${value}`, "Ingresos"]}
                  labelFormatter={(label) => `Procedimiento: ${label}`}
                />
                <Bar dataKey="revenue" fill="#FF8E53" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas mensuales (solo para rango anual) */}
      {timeRange === "year" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Estadísticas Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="count" 
                  stroke="#4A90E2" 
                  name="Citas" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#50C878" 
                  name="Ingresos ($)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas detalladas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{pendingAppointments}</div>
            <p className="text-sm text-muted-foreground">Citas por confirmar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Canceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{cancelledAppointments}</div>
            <p className="text-sm text-muted-foreground">Citas canceladas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Tasa de Confirmación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {totalAppointments > 0 
                ? `${Math.round((confirmedAppointments / totalAppointments) * 100)}%` 
                : "0%"}
            </div>
            <p className="text-sm text-muted-foreground">Citas confirmadas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};