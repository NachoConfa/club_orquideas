const CompanyIntro = () => {
  return (
    <section className="bg-[#FAF4EC] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#0F8F61]">
              Modo Plantas
            </p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-[#2F3A35] sm:text-5xl">
              Plantas que transforman espacios
            </h2>
            <div className="mt-6 max-w-3xl space-y-5 text-base leading-8 text-[#6B756F] sm:text-lg">
              <p>
                En Modo Plantas creemos que cada planta puede transformar un espacio.
                Trabajamos con plantas seleccionadas, macetas y arreglos pensados para acompañar
                hogares, regalos y momentos especiales con elegancia y vida.
              </p>
              <p>
                Nuestro objetivo es acercarte plantas cuidadas, combinaciones delicadas y
                asesoramiento para que puedas disfrutar tus espacios verdes por mucho más tiempo.
              </p>
            </div>
            <p className="mt-8 border-l-4 border-[#0F8F61] pl-5 text-xl font-medium italic text-[#2F3A35]">
              Cada flor tiene su tiempo, su forma y su encanto.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[#EADBC8] shadow-sm">
            <img
              src="https://images.pexels.com/photos/6231990/pexels-photo-6231990.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Plantas cuidadas en un espacio luminoso"
              loading="lazy"
              decoding="async"
              className="h-[360px] w-full object-cover sm:h-[440px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2F3A35]/30 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyIntro;
