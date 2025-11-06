import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, DollarSign, Calendar, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import { getProcedureImageUrl } from "@/lib/getProcedureImageUrl";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Procedure = Tables<"procedures">;

type ProcedureImage = Tables<"procedure_images"> & {
  image_url: string;
};

const ProcedureDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [procedureImages, setProcedureImages] = useState<ProcedureImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchProcedure();
      fetchProcedureImages();
    }
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    // Configurar la rotación automática solo si hay más de una imagen
    if (procedureImages.length > 1) {
      // Limpiar cualquier intervalo existente
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Configurar nuevo intervalo (5 segundos)
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex(prevIndex => 
          prevIndex === procedureImages.length - 1 ? 0 : prevIndex + 1
        );
      }, 6000); // 5 segundos
      
      // Limpiar el intervalo cuando el efecto se limpie
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [procedureImages.length]);

  const fetchProcedure = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        // Procesar la imagen principal
        const processedProcedure: Procedure = {
          ...data,
          image_url: data.image_url ? getProcedureImageUrl(data.image_url) : null
        };
        
        setProcedure(processedProcedure);
      }
    } catch (error) {
      console.error("Error fetching procedure:", error);
      toast.error("Error al cargar el procedimiento");
    } finally {
      setLoading(false);
    }
  };

  const fetchProcedureImages = async () => {
    try {
      const { data, error } = await supabase
        .from("procedure_images")
        .select("*")
        .eq("procedure_id", id)
        .order("position", { ascending: true });

      if (error) throw error;

      if (data) {
        // Procesar las URLs de las imágenes
        const imagesWithProcessedUrls = data.map((image) => ({
          ...image,
          image_url: getProcedureImageUrl(image.image_url)
        }));
        setProcedureImages(imagesWithProcessedUrls);
      }
    } catch (error) {
      console.error("Error fetching procedure images:", error);
      toast.error("Error al cargar las imágenes del procedimiento");
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === procedureImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? procedureImages.length - 1 : prevIndex - 1
    );
  };

  // Reiniciar el temporizador cuando el usuario interactúa manualmente
  const handleManualNavigation = (newIndex: number) => {
    // Limpiar el intervalo existente
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Actualizar el índice
    setCurrentImageIndex(newIndex);
    
    // Reiniciar el intervalo
    if (procedureImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex(prevIndex => 
          prevIndex === procedureImages.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000); // 5 segundos
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando procedimiento...</p>
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Procedimiento no encontrado</p>
          <Button onClick={() => navigate(-1)}>Volver atrás</Button>
        </div>
      </div>
    );
  }

  // Función para convertir texto con \n en una lista
  const renderTextAsList = (text: string | null) => {
    if (!text) return null;
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 1) {
      return <p className="text-muted-foreground text-lg leading-relaxed">{text}</p>;
    }
    
    return (
      <ul className="space-y-3">
        {lines.map((line, index) => (
          <li key={index} className="flex items-start">
            <Leaf className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground text-lg leading-relaxed">{line.trim()}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Componente de carrusel de imágenes
  const ImageCarousel = () => {
    // Si no hay imágenes adicionales, mostrar solo la imagen principal
    if (procedureImages.length === 0) {
      return (
        <div className="relative h-96 rounded-xl overflow-hidden shadow-xl mx-auto max-w-4xl ken-burns">
          {procedure.image_url ? (
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ken-burns"
              style={{ 
                backgroundImage: `url(${procedure.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
              <span className="text-muted-foreground">Imagen no disponible</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/30" />
        </div>
      );
    }

    // Si hay imágenes, mostrar el carrusel
    return (
      <div className="relative h-96 rounded-xl overflow-hidden shadow-xl mx-auto max-w-4xl">
        {/* Imágenes del carrusel con transición avanzada */}
        {procedureImages.map((image, index) => (
          <div 
            key={image.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentImageIndex 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-95'
            } carousel-image`}
            style={{ 
              backgroundImage: `url(${image.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transform: index === currentImageIndex 
                ? 'scale(1) translateX(0)' 
                : index < currentImageIndex 
                  ? 'scale(0.95) translateX(-20px)' 
                  : 'scale(0.95) translateX(20px)'
            }}
          />
        ))}

        {/* Overlay para mejor legibilidad */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Indicadores */}
        {procedureImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {procedureImages.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-500 ease-in-out ${
                  index === currentImageIndex 
                    ? 'bg-white w-8 shadow-lg' 
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                onClick={() => handleManualNavigation(index)}
                aria-label={`Ir a la imagen ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Botones de navegación */}
        {procedureImages.length > 1 && (
          <>
            <button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 btn-animated"
              onClick={() => {
                handleManualNavigation(currentImageIndex === 0 ? procedureImages.length - 1 : currentImageIndex - 1);
              }}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 btn-animated"
              onClick={() => {
                handleManualNavigation(currentImageIndex === procedureImages.length - 1 ? 0 : currentImageIndex + 1);
              }}
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          </>
        )}

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-4 bounce-in">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg tracking-tight slide-in-left">
            {procedure.name}
          </h1>
          <Button 
            size="lg"
            className="bg-white text-primary hover:bg-white/90 shadow-lg text-lg px-8 py-6 font-medium transition-all duration-300 hover:shadow-xl btn-animated slide-in-right"
            onClick={() => navigate("/auth")}
          >
            Agendar Cita
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)} 
          className="mb-6 hover:bg-accent transition-colors duration-300 btn-animated"
        >
          ← Volver
        </Button>

        {/* Hero Section con carrusel de imágenes */}
        <ImageCarousel />

        {/* Sección de detalles - mismo ancho que la imagen */}
        <div className="mx-auto max-w-4xl fade-in-up">
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="text-center pb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 mx-auto bounce-in">
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-3xl text-primary font-medium slide-in-left">
                Acerca de este servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-10 pb-8">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center p-6 bg-accent/30 rounded-xl hover:bg-accent/50 transition-colors duration-300 info-card">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Duración</p>
                  <p className="font-semibold text-lg">{procedure.duration_minutes} minutos</p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-accent/30 rounded-xl hover:bg-accent/50 transition-colors duration-300 info-card">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Precio</p>
                  <p className="font-semibold text-lg">${procedure.price}</p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-accent/30 rounded-xl hover:bg-accent/50 transition-colors duration-300 info-card">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Disponibilidad</p>
                  <Badge 
                    variant={procedure.is_active ? "default" : "destructive"}
                    className="px-4 py-1.5 text-base"
                  >
                    {procedure.is_active ? "Disponible" : "No disponible"}
                  </Badge>
                </div>
              </div>

              {/* Descripción detallada */}
              {procedure.detailed_description && (
                <div className="space-y-4 fade-in-up">
                  <h3 className="text-2xl font-semibold text-primary flex items-center gap-2">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <Leaf className="h-4 w-4 text-primary" />
                    </div>
                    Descripción del Servicio
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line bg-accent/20 p-6 rounded-xl">
                    {procedure.detailed_description}
                  </p>
                </div>
              )}

              {/* Beneficios */}
              {procedure.benefits && (
                <div className="space-y-4 fade-in-up">
                  <h3 className="text-2xl font-semibold text-primary flex items-center gap-2">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <Leaf className="h-4 w-4 text-primary" />
                    </div>
                    Beneficios
                  </h3>
                  <div className="bg-accent/20 p-6 rounded-xl">
                    {renderTextAsList(procedure.benefits)}
                  </div>
                </div>
              )}

              {/* Preparación */}
              {procedure.preparation && (
                <div className="space-y-4 fade-in-up">
                  <h3 className="text-2xl font-semibold text-primary flex items-center gap-2">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <Leaf className="h-4 w-4 text-primary" />
                    </div>
                    Preparación
                  </h3>
                  <div className="bg-accent/20 p-6 rounded-xl">
                    {renderTextAsList(procedure.preparation)}
                  </div>
                </div>
              )}

              {/* Video del procedimiento */}
              {procedure.video_url && (
                <div className="space-y-4 fade-in-up">
                  <h3 className="text-2xl font-semibold text-primary flex items-center gap-2">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <Play className="h-4 w-4 text-primary" />
                    </div>
                    Video Explicativo
                  </h3>
                  <div className="aspect-video bg-muted rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                    <video 
                      src={procedure.video_url} 
                      controls 
                      className="w-full h-full rounded-xl"
                      onError={() => {
                        toast.error("Error al cargar el video");
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProcedureDetail;