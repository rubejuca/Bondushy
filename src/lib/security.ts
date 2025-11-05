import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Verificar si el usuario tiene un rol específico
export const hasRole = async (userId: string, role: AppRole): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('has_role', { _user_id: userId, _role: role });
    
    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error in hasRole function:', error);
    return false;
  }
};

// Verificar si el usuario es administrador
export const isAdmin = async (userId: string): Promise<boolean> => {
  return await hasRole(userId, 'admin');
};

// Verificar si el usuario es paciente
export const isPatient = async (userId: string): Promise<boolean> => {
  return await hasRole(userId, 'patient');
};

// Middleware para proteger rutas administrativas
export const requireAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Debes iniciar sesión");
      return false;
    }
    
    const userIsAdmin = await isAdmin(user.id);
    
    if (!userIsAdmin) {
      toast.error("Acceso denegado. Se requieren permisos de administrador.");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in requireAdmin:', error);
    toast.error("Error de autenticación");
    return false;
  }
};

// Middleware para proteger rutas de paciente
export const requirePatient = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Debes iniciar sesión");
      return false;
    }
    
    const userIsPatient = await isPatient(user.id);
    
    if (!userIsPatient) {
      toast.error("Acceso denegado. Se requieren permisos de paciente.");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in requirePatient:', error);
    toast.error("Error de autenticación");
    return false;
  }
};

// Validar contraseña según política de seguridad
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe incluir al menos una letra mayúscula");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe incluir al menos una letra minúscula");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe incluir al menos un número");
  }
  
  if (!/[!@#$%^&*()_+\-=\\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push("La contraseña debe incluir al menos un carácter especial");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Sanitizar entradas de usuario para prevenir XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

// Validar formato de email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Registrar intento de acceso fallido
export const logFailedAttempt = async (userId: string | null, action: string, ipAddress?: string): Promise<void> => {
  try {
    // En un entorno de producción, esto se guardaría en una tabla de logs
    console.warn(`Failed attempt: ${action} by ${userId || 'anonymous'} from ${ipAddress || 'unknown'}`);
    
    // Aquí podrías implementar el registro en una tabla de auditoría
    // await supabase.from('security_logs').insert({
    //   user_id: userId,
    //   action: action,
    //   ip_address: ipAddress,
    //   success: false,
    //   timestamp: new Date().toISOString()
    // });
  } catch (error) {
    console.error('Error logging failed attempt:', error);
  }
};

// Registrar acceso exitoso
export const logSuccessfulLogin = async (userId: string, ipAddress?: string): Promise<void> => {
  try {
    // En un entorno de producción, esto se guardaría en una tabla de logs
    console.info(`Successful login: ${userId} from ${ipAddress || 'unknown'}`);
    
    // Aquí podrías implementar el registro en una tabla de auditoría
    // await supabase.from('security_logs').insert({
    //   user_id: userId,
    //   action: 'login',
    //   ip_address: ipAddress,
    //   success: true,
    //   timestamp: new Date().toISOString()
    // });
  } catch (error) {
    console.error('Error logging successful login:', error);
  }
};