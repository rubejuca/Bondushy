import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Leaf, Sparkles, Calendar, MessageSquare, ChevronRight, User, Star, Clock, MapPin, Phone, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useProcedures } from "@/hooks/useProcedures";

const Index = () => {
  const navigate = useNavigate();
  const { procedures, loading, fetchProcedures } = useProcedures();
  const [hoveredProcedure, setHoveredProcedure] = useState<string | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    checkUser();
    
    // Configurar el Intersection Observer para las animaciones de scroll
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observar todas las secciones con la clase scroll-animate
    const sections = document.querySelectorAll('.scroll-animate');
    sections.forEach((section) => {
      observerRef.current?.observe(section);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    }
  };

  const handleViewDetails = (procedureId: string) => {
    navigate(`/procedures/${procedureId}`);
  };

  // Función para insertar procedimientos de ejemplo si no existen
  const insertSampleProcedures = async () => {
    try {
      // Verificar si ya existen procedimientos
      const { data: existingProcedures, error: fetchError } = await supabase
        .from("procedures")
        .select("id")
        .limit(1);

      if (fetchError) {
        console.error("Error checking existing procedures:", fetchError);
        toast.error("Error al verificar procedimientos existentes");
        return;
      }

      // Si no hay procedimientos, insertar los de ejemplo
      if (!existingProcedures || existingProcedures.length === 0) {
        const sampleProcedures = [
          {
            name: "Exfoliación Corporal",
            description: "Tratamiento de exfoliación profunda para suavizar la piel",
            duration_minutes: 60,
            price: 60.00,
            image_url: "/images/procedures/body-scrub.jpg",
            is_active: true
          },
          {
            name: "Facial Hidratante",
            description: "Tratamiento facial profundo con hidratación intensiva",
            duration_minutes: 45,
            price: 65.00,
            image_url: "/images/procedures/facial-hydrating.jpg",
            is_active: true
          },
          {
            name: "Tratamiento Capilar Nutritivo",
            description: "Mascarilla intensiva para cabello seco y dañado",
            duration_minutes: 50,
            price: 50.00,
            image_url: "/images/procedures/hair-treatment.jpg",
            is_active: true
          }
        ];

        const { error: insertError } = await supabase
          .from("procedures")
          .insert(sampleProcedures);

        if (insertError) {
          console.error("Error inserting sample procedures:", insertError);
          toast.error("Error al insertar procedimientos de ejemplo");
        } else {
          toast.success("Procedimientos de ejemplo insertados correctamente");
          fetchProcedures(); // Recargar los procedimientos
        }
      } else {
        toast.info("Ya existen procedimientos en la base de datos");
        fetchProcedures(); // Recargar los procedimientos existentes
      }
    } catch (error) {
      console.error("Error inserting sample procedures:", error);
      toast.error("Error al insertar procedimientos de ejemplo");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-background to-muted">
      {/* Navegación mejorada con efectos interactivos */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer transition-all duration-500"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 transition-all duration-500 ${isLogoHovered ? 'rotate-[360deg] scale-110' : ''}`}>
              <Leaf className={`h-5 w-5 text-primary transition-all duration-500 ${isLogoHovered ? 'text-accent' : ''}`} />
            </div>
            <span className={`text-lg font-semibold transition-all duration-500 bg-gradient-to-r ${isLogoHovered ? 'from-accent to-primary' : 'from-primary to-accent'} bg-clip-text text-transparent`}>
              BondushySpa
            </span>
          </div>
          <Button 
            onClick={() => navigate("/auth")} 
            className="group transition-all duration-300 hover:shadow-lg text-sm px-4 py-2"
          >
            Iniciar Sesión
            <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4">
        {/* Sección hero mejorada */}
        <section className="py-16 text-center relative overflow-hidden scroll-animate" id="hero">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-primary/15 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 backdrop-blur-sm border border-primary/20 transition-all duration-700 hover:scale-110">
              <Leaf className="w-10 h-10 text-primary animate-float" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-5 text-foreground tracking-tight font-heading hero-title">
              Bienvenido a BondushySpa
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed hero-subtitle">
              Tu espacio de bienestar y relajación. Agenda tus citas, explora nuestros tratamientos y consulta con nuestros expertos.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button 
                size="default" 
                onClick={() => navigate("/auth")}
                className="group px-6 py-4 text-base font-medium transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                Comenzar Ahora
                <Sparkles className="ml-2 h-4 w-4 transition-transform group-hover:rotate-12" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="default" 
                    variant="outline"
                    className="px-6 py-4 text-base font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    Ver Procedimientos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border rounded-2xl shadow-2xl" aria-describedby="procedures-description">
                  <DialogHeader className="border-b border-border pb-4">
                    <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
                      <Leaf className="h-6 w-6 text-foreground" />
                      Nuestros Procedimientos
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm mt-2">
                      Explora nuestra gama completa de tratamientos de bienestar
                    </p>
                  </DialogHeader>
                  <p id="procedures-description" className="sr-only">
                    Lista de procedimientos disponibles en BondushySpa. Seleccione un procedimiento para agendar una cita.
                  </p>
                  <div className="grid gap-4 py-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm">Cargando procedimientos...</p>
                      </div>
                    ) : procedures.length > 0 ? (
                      procedures.map((procedure) => (
                        <Card 
                          key={procedure.id} 
                          className="cursor-pointer hover:bg-accent transition-all duration-300 overflow-hidden group border-border hover:border-accent-foreground/30 hover:shadow-lg"
                          onMouseEnter={() => setHoveredProcedure(procedure.id)}
                          onMouseLeave={() => setHoveredProcedure(null)}
                        >
                          <div className="relative">
                            {procedure.image_url ? (
                              <div 
                                className="h-32 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                style={{ 
                                  backgroundImage: `url(${procedure.image_url})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat'
                                }}
                              />
                            ) : (
                              <div className="h-32 bg-gradient-to-r from-accent/20 to-muted/20 flex items-center justify-center">
                                <span className="text-muted-foreground text-sm">Imagen no disponible</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute top-2 right-2">
                              <div className="bg-accent/80 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs font-medium">
                                ${procedure.price}
                              </div>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3">
                              <CardTitle className="text-white flex justify-between items-center text-base">
                                <span>{procedure.name}</span>
                              </CardTitle>
                              <CardDescription className="text-white/90 text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {procedure.duration_minutes} minutos
                              </CardDescription>
                            </div>
                          </div>
                          <CardContent className="pt-3 pb-3">
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(procedure.id);
                              }}
                              className="w-full group/btn text-sm h-8 bg-accent hover:bg-accent/90 text-accent-foreground"
                              variant="default"
                            >
                              Ver detalles
                              <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4 text-sm">
                          No hay procedimientos disponibles en este momento.
                        </p>
                        <div className="flex flex-col gap-2">
                          <Button onClick={fetchProcedures} variant="outline" size="sm" className="text-xs">
                            Reintentar
                          </Button>
                          <Button onClick={insertSampleProcedures} variant="default" size="sm" className="text-xs">
                            Insertar Procedimientos de Ejemplo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* Sección de procedimientos destacados */}
        <section className={`py-12 scroll-animate ${visibleSections.has('procedures') ? 'scroll-fade-in visible' : 'scroll-fade-in'}`} id="procedures">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3 font-heading">
              Nuestros <span className="bg-gradient-to-r from-accent to-muted-foreground bg-clip-text text-transparent">Tratamientos</span> Destacados
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Descubre nuestros procedimientos más populares y experimenta el bienestar
            </p>
          </div>
          
          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden shadow-lg h-80 animate-pulse">
                  <div className="bg-muted h-48 w-full"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : procedures.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {procedures.slice(0, 3).map((procedure, index) => (
                <div 
                  key={procedure.id}
                  className="group relative bg-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 border border-transparent hover:border-accent/30"
                  onClick={() => handleViewDetails(procedure.id)}
                  onMouseEnter={() => setHoveredProcedure(procedure.id)}
                  onMouseLeave={() => setHoveredProcedure(null)}
                >
                  <div className="relative h-52 overflow-hidden">
                    {procedure.image_url ? (
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ 
                          backgroundImage: `url(${procedure.image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-muted/20 flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">Imagen no disponible</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute top-3 right-3">
                      <div className="bg-accent/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs font-medium flex items-center gap-1">
                        <span>${procedure.price}</span>
                      </div>
                    </div>
                    <div className="absolute top-3 left-3">
                      <div className="bg-accent/80 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
                        <Leaf className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                        {procedure.name}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {procedure.description || "Descripción no disponible"}
                    </p>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-muted">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                        <span className="text-xs text-muted-foreground">
                          {procedure.duration_minutes} min
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 h-7 text-xs px-2 bg-accent/10 hover:bg-accent/20 text-accent-foreground"
                      >
                        Ver detalles
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Efecto de resplandor al hacer hover */}
                  <div className="absolute inset-0 rounded-2xl shadow-[0_0_20px_rgba(90,90,90,0.2)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-5 text-sm">
                No hay procedimientos disponibles en este momento.
              </p>
              <Button onClick={insertSampleProcedures} variant="default" className="text-sm">
                Insertar Procedimientos de Ejemplo
              </Button>
            </div>
          )}
        </section>

        {/* Sección de características mejorada */}
        <section className={`py-12 scroll-animate ${visibleSections.has('features') ? 'scroll-slide-in-left visible' : 'scroll-slide-in-left'}`} id="features">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-2xl bg-card hover:bg-accent transition-all duration-300 group hover:-translate-y-1 shadow-lg hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors">
                <Calendar className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Agenda Fácilmente</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sistema de reservas intuitivo con calendario en tiempo real
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card hover:bg-accent transition-all duration-300 group hover:-translate-y-1 shadow-lg hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Tratamientos Premium</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Amplio catálogo de procedimientos de bienestar y belleza
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card hover:bg-accent transition-all duration-300 group hover:-translate-y-1 shadow-lg hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Asistente Virtual</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Consulta sobre procedimientos y recibe recomendaciones personalizadas
              </p>
            </div>
          </div>
        </section>

        {/* Sección de llamada a la acción */}
        <section className={`py-16 text-center scroll-animate ${visibleSections.has('cta') ? 'scroll-fade-in visible' : 'scroll-fade-in'}`} id="cta">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-5 text-foreground font-heading">
              ¿Listo para comenzar tu <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">experiencia</span> de bienestar?
            </h2>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
              Únete a nuestra comunidad y descubre un nuevo nivel de relajación y cuidado personal
            </p>
            <Button 
              size="default" 
              onClick={() => navigate("/auth")}
              className="px-8 py-5 text-base font-medium transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              Agenda tu primera cita
              <Calendar className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Nueva sección Conócenos */}
        <section className={`py-16 scroll-animate ${visibleSections.has('about') ? 'scroll-slide-in-right visible' : 'scroll-slide-in-right'}`} id="about">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-heading">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Conócenos</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Descubre quiénes somos y conoce a nuestros profesionales dedicados a tu bienestar
              </p>
            </div>
            
            <div className="bg-card rounded-2xl p-8 shadow-xl">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-foreground mb-4">Nuestra Especialista</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    <span className="font-semibold">Esteticista Profesional</span> | Especialista en Cosmiatría | Enfermera
                  </p>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    Con más de 18 años de experiencia en el campo de la estética facial y corporal, nuestra especialista combina conocimientos clínicos con técnicas avanzadas para ofrecer resultados seguros, efectivos y personalizados.
                  </p>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                   Formada en la Academia de Estética – Método CEM y con especialización en la Escuela de Estética
                  </p>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Su compromiso, calidez humana y atención al detalle la han convertido en una referente en tratamientos de rejuvenecimiento, bienestar y belleza natural.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    </div>
                    <span className="text-muted-foreground">4.9/5 Calificación promedio</span>
                  </div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="relative group">
                    <div className="overflow-hidden rounded-2xl shadow-2xl transform transition-all duration-500">
                      <img 
                        src="https://bnankphxrceakdazrhbs.supabase.co/storage/v1/object/public/procedures/ChatGPT%20Image%205%20nov%202025,%2008_06_53%20p.m..png" 
                        alt="Dra. Monica Polentino" 
                        className="w-64 h-80 object-cover transition-all duration-700"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="absolute bottom-4 left-4 right-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
                      <h4 className="text-white font-semibold text-lg">Dra. Monica Polentino</h4>
                      <p className="text-white/90 text-sm">Esteticista Profesional</p>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-card">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12">
                <h3 className="text-2xl font-semibold text-foreground mb-6 text-center">Nuestro Equipo de Profesionales</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-6 rounded-xl bg-accent/20 hover:bg-accent/30 transition-all duration-300 group">
                    <div className="flex justify-center mb-4">
                      <div className="overflow-hidden rounded-lg shadow-md transform transition-all duration-300 group-hover:shadow-lg">
                        <img 
                          src="https://bnankphxrceakdazrhbs.supabase.co/storage/v1/object/public/procedures/ChatGPT%20Image%205%20nov%202025,%2008_06_53%20p.m..png" 
                          alt="Dra. Monica Polentino" 
                          className="w-16 h-20 object-cover"
                        />
                      </div>
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">Dra. Monica Polentino</h4>
                    <p className="text-sm text-muted-foreground mb-3">Esteticista Profesional</p>
                    <p className="text-xs text-muted-foreground">
                      Con más de 15 años de experiencia en tratamientos de bienestar y medicina estética.
                    </p>
                  </div>
                  {[2, 3].map((item) => (
                    <div key={item} className="text-center p-6 rounded-xl bg-accent/20 hover:bg-accent/30 transition-colors duration-300">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground mb-2">Profesional {item}</h4>
                      <p className="text-sm text-muted-foreground mb-3">Especialista en Bienestar</p>
                      <p className="text-xs text-muted-foreground">
                        Con más de 5 años de experiencia en tratamientos personalizados para tu relajación.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Nueva sección Encuéntranos */}
        <section className={`py-16 scroll-animate ${visibleSections.has('contact') ? 'scroll-slide-in-right visible' : 'scroll-slide-in-right'}`} id="contact">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-heading">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Encuéntranos</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Visítanos en nuestras instalaciones y comienza tu experiencia de bienestar
              </p>
            </div>
            
            <div className="bg-card rounded-2xl p-8 shadow-xl">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-foreground mb-6">Nuestra Ubicación</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-accent/20 hover:bg-accent/30 transition-all duration-300 group">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Dirección</h4>
                        <p className="text-muted-foreground text-sm">
                          Carrera 9 #43-44<br />
                          Villa Marlén 2, Ibague, Tolima<br />
                          Colombia
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-accent/20 hover:bg-accent/30 transition-all duration-300 group">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Horario</h4>
                        <p className="text-muted-foreground text-sm">
                          Lunes a Viernes: 9:00 AM - 8:00 PM<br />
                          Sábados: Cerrado<br />
                          Domingos: 9:00 AM - 8:00 PM
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-accent/20 hover:bg-accent/30 transition-all duration-300 group">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Contacto</h4>
                        <p className="text-muted-foreground text-sm">
                          Teléfono: (123) 456-7890<br />
                          Email: info@bondushyspa.com
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <Button 
                      onClick={() => window.open('https://maps.google.com/?q=Av.+Principal+123,+Ciudad', '_blank')}
                      className="group px-6 py-4 text-base font-medium transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    >
                      Abrir en Google Maps
                      <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="relative h-full min-h-[400px] rounded-2xl overflow-hidden shadow-lg group">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d991.6667641177975!2d-75.2426948292214!3d4.444675132444015!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e38f17303900001%3A0x4a0f2dc1e8d3b8d3!2sCra.%209%20%2343-44%2C%20Ibagu%C3%A9%2C%20Tolima%2C%20Colombia!5e0!3m2!1ses!2sco!4v1650000000000!5m2!1ses!2sco"
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Ubicación de BondushySpa"
                    ></iframe>
                    
                    {/* Overlay sutil para efectos visuales */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-primary animate-ping"></div>
                      <div className="absolute bottom-8 left-8 w-6 h-6 rounded-full bg-accent/50 blur-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t mt-16 py-8 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div 
              className="flex items-center gap-2 mb-3 md:mb-0 cursor-pointer"
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
            >
              <Leaf className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold">BondushySpa</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} BondushySpa. Tu espacio de bienestar.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;