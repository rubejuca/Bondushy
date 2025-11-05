import { supabase } from "@/integrations/supabase/client";

export const getProcedureImageUrl = (path: string | null): string => {
  if (!path) return "";
  
  // Si ya es una URL completa, retornarla tal cual
  if (path.startsWith("http")) {
    return path;
  }
  
  // Si es una ruta relativa, obtener la URL pública desde Supabase Storage
  try {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const { data } = supabase.storage.from("procedures").getPublicUrl(cleanPath);
    return data?.publicUrl || "";
  } catch (error) {
    console.error("Error obteniendo URL de imagen:", error);
    return "";
  }
};

export const uploadProcedureImage = async (file: File, fileName: string): Promise<string | null> => {
  try {
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("procedures")
      .upload(uniqueFileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Error subiendo imagen:", uploadError);
      return null;
    }

    // Obtener la URL pública de la imagen subida
    const { data } = supabase.storage.from("procedures").getPublicUrl(uniqueFileName);
    return data?.publicUrl || null;
  } catch (error) {
    console.error("Error en uploadProcedureImage:", error);
    return null;
  }
};