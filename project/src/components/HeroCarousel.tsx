import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type HeroPage = 'orchids' | 'pots' | 'arrangements' | 'care';

interface HeroCarouselProps {
  onNavigate: (page: HeroPage) => void;
}

const slides: Array<{
  title: string;
  subtitle: string;
  buttonLabel: string;
  page: HeroPage;
  image: string;
  eyebrow: string;
}> = [
  {
    title: 'Orquídeas que transforman espacios',
    subtitle: 'Elegí plantas únicas, elegantes y llenas de vida para tu hogar.',
    buttonLabel: 'Ver orquídeas',
    page: 'orchids',
    eyebrow: 'Colección viva',
    image: 'https://images.pexels.com/photos/459196/pexels-photo-459196.jpeg?auto=compress&cs=tinysrgb&w=1800',
  },
  {
    title: 'Macetas y otros detalles con estilo',
    subtitle: 'Combiná tus plantas con diseños delicados, modernos y pensados para lucirlas mejor.',
    buttonLabel: 'Ver macetas',
    page: 'pots',
    eyebrow: 'Detalles para cada ambiente',
    image: 'https://images.pexels.com/photos/4505166/pexels-photo-4505166.jpeg?auto=compress&cs=tinysrgb&w=1800',
  },
  {
    title: 'Arreglos florales personalizados',
    subtitle: 'Creamos regalos y composiciones especiales para acompañar cada ocasión.',
    buttonLabel: 'Ver arreglos',
    page: 'arrangements',
    eyebrow: 'Regalos con presencia',
    image: 'https://images.pexels.com/photos/931162/pexels-photo-931162.jpeg?auto=compress&cs=tinysrgb&w=1800',
  },
  {
    title: 'Cuidado experto para tus plantas',
    subtitle: 'Consejos, productos y acompañamiento para que crezcan mejor durante todo el año.',
    buttonLabel: 'Conocer cuidados',
    page: 'care',
    eyebrow: 'Cultivo y mantenimiento',
    image: 'https://images.pexels.com/photos/6231990/pexels-photo-6231990.jpeg?auto=compress&cs=tinysrgb&w=1800',
  },
];

const HeroCarousel: React.FC<HeroCarouselProps> = ({ onNavigate }) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 6500);

    return () => window.clearInterval(intervalId);
  }, []);

  const goToPrevious = () => {
    setActiveSlideIndex((currentIndex) => (currentIndex - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setActiveSlideIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  return (
    <section className="relative min-h-[540px] overflow-hidden bg-[#16352B] sm:min-h-[620px] lg:min-h-[760px]">
      {slides.map((slide, index) => (
        <div
          key={slide.title}
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
            activeSlideIndex === index ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={activeSlideIndex !== index}
        >
          <img src={slide.image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#16352B]/88 via-[#16352B]/60 to-[#16352B]/20" />
          <div className="absolute inset-0 bg-[#0F8F61]/10" />
        </div>
      ))}

      <div className="relative z-10 mx-auto flex min-h-[540px] max-w-7xl items-center px-4 py-12 sm:min-h-[620px] sm:px-6 sm:py-16 lg:min-h-[760px] lg:px-8">
        <div className="max-w-3xl text-white">
          <p className="mb-4 inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFF8EF] backdrop-blur sm:text-xs">
            {slides[activeSlideIndex].eyebrow}
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-[#FFF8EF] sm:text-5xl lg:text-6xl">
            {slides[activeSlideIndex].title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
            {slides[activeSlideIndex].subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => onNavigate(slides[activeSlideIndex].page)}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0F8F61] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#16352B]/20 transition-colors hover:bg-[#0C7A52] sm:w-auto"
            >
              {slides[activeSlideIndex].buttonLabel}
            </button>
            <button
              onClick={() => onNavigate('care')}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/45 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 sm:w-auto"
            >
              Guía de cuidados
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/15 px-4 py-2 backdrop-blur">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setActiveSlideIndex(index)}
            className={`h-2.5 rounded-full transition-all ${
              activeSlideIndex === index ? 'w-8 bg-[#FFF8EF]' : 'w-2.5 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Ver slide ${index + 1}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-white/15 p-3 text-white backdrop-blur transition-colors hover:bg-white/25 md:block"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={goToNext}
        className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-white/15 p-3 text-white backdrop-blur transition-colors hover:bg-white/25 md:block"
        aria-label="Slide siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
};

export default HeroCarousel;
