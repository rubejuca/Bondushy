import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getProcedureImageUrl, uploadProcedureImage } from "@/lib/getProcedureImageUrl";

export interface Procedure {
  id: string;
  name: string;
  description: string | null;
  detailed_description: string | null;
  benefits: string | null;
  preparation: string | null;
  duration_minutes: number;
  price: number | null;
  image_url: string | null;
  video_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProcedureInsert {
  name: string;
  description?: string | null;
  detailed_description?: string | null;
  benefits?: string | null;
  preparation?: string | null;
  duration_minutes?: number;
  price?: number | null;
  image_url?: string | null;
  video_url?: string | null;
  is_active?: boolean;
}

export const useProcedures = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProcedures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      // Procesar las URLs de las imágenes
      const processedProcedures = data?.map((procedure) => {
        const typedProcedure = procedure as unknown as Procedure;
        return {
          ...typedProcedure,
          image_url: getProcedureImageUrl(typedProcedure.image_url)
        };
      }) || [];

      setProcedures(processedProcedures);
    } catch (error) {
      console.error("Error fetching procedures:", error);
      toast.error("Error al cargar los procedimientos");
    } finally {
      setLoading(false);
    }
  };

  const insertProcedure = async (procedure: ProcedureInsert, imageFile?: File) => {
    try {
      let imageUrl = procedure.image_url || "";
      
      // Si se proporciona un archivo de imagen, subirlo a Supabase Storage
      if (imageFile) {
        const uploadedUrl = await uploadProcedureImage(imageFile, imageFile.name);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from("procedures")
        .insert([{ ...procedure, image_url: imageUrl }]);

      if (error) throw error;

      toast.success("Procedimiento creado correctamente");
      fetchProcedures(); // Recargar la lista
      return true;
    } catch (error) {
      console.error("Error inserting procedure:", error);
      toast.error("Error al crear el procedimiento");
      return false;
    }
  };

  const updateProcedure = async (id: string, updates: Partial<ProcedureInsert>, imageFile?: File) => {
    try {
      let imageUrl = updates.image_url || "";
      
      // Si se proporciona un archivo de imagen, subirlo a Supabase Storage
      if (imageFile) {
        const uploadedUrl = await uploadProcedureImage(imageFile, imageFile.name);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from("procedures")
        .update({ ...updates, image_url: imageUrl || undefined })
        .eq("id", id);

      if (error) throw error;

      toast.success("Procedimiento actualizado correctamente");
      fetchProcedures(); // Recargar la lista
      return true;
    } catch (error) {
      console.error("Error updating procedure:", error);
      toast.error("Error al actualizar el procedimiento");
      return false;
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

  return {
    procedures,
    loading,
    fetchProcedures,
    insertProcedure,
    updateProcedure
  };
};