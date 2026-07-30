import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-base-100 text-base-content flex flex-col">
      {/* Navbar */}
      <nav className="navbar max-w-5xl mx-auto w-full px-6 py-4">
        <div className="flex-1">
          <span className="text-lg font-semibold tracking-tight text-base-content">
            canvas<span className="text-primary">.</span>
          </span>
        </div>
        <div className="flex-none flex items-center gap-2">
          <Link href="#work" className="btn btn-ghost btn-sm rounded-full text-sm font-normal">
            Work
          </Link>
          <Link href="#about" className="btn btn-ghost btn-sm rounded-full text-sm font-normal">
            About
          </Link>
          <Link href="#contact" className="btn btn-primary btn-sm rounded-full text-sm">
            Contact
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-3xl mx-auto w-full">
        <div className="badge badge-outline badge-sm mb-6 tracking-widest uppercase text-xs opacity-60">
          Available for work
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
          Crafting ideas into{" "}
          <span className="text-primary">digital experiences</span>
        </h1>
        <p className="text-base-content/60 text-lg max-w-xl leading-relaxed mb-10">
          I design and build thoughtful interfaces that are simple, fast, and
          a pleasure to use. Let's make something great together.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="#work" className="btn btn-primary rounded-full px-8">
            View My Work
          </Link>
          <Link href="#about" className="btn btn-ghost rounded-full px-8">
            Learn More
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="divider max-w-5xl mx-auto w-full px-6 opacity-20" />

      {/* Stats Row */}
      <section className="py-14 px-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "5+", label: "Years Experience" },
            { value: "40+", label: "Projects Shipped" },
            { value: "12+", label: "Happy Clients" },
            { value: "99%", label: "Satisfaction Rate" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-primary">{value}</span>
              <span className="text-sm text-base-content/50">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="divider max-w-5xl mx-auto w-full px-6 opacity-20" />

      {/* Work Section */}
      <section id="work" className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
            Selected Work
          </p>
          <h2 className="text-3xl font-bold tracking-tight">Recent Projects</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              tag: "Design System",
              title: "Lunar UI",
              desc: "A cohesive component library built for scale and accessibility.",
            },
            {
              tag: "Web App",
              title: "Folio Dashboard",
              desc: "Real-time analytics dashboard with a clean, data-dense layout.",
            },
            {
              tag: "Branding",
              title: "Arca Studio",
              desc: "Visual identity and brand guide for a modern architecture firm.",
            },
          ].map(({ tag, title, desc }) => (
            <article
              key={title}
              className="card bg-base-200 border border-base-300/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="card-body gap-3">
                <span className="badge badge-ghost badge-sm w-fit text-xs">{tag}</span>
                <h3 className="card-title text-lg font-semibold group-hover:text-primary transition-colors duration-200">
                  {title} →
                </h3>
                <p className="text-sm text-base-content/55 leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-base-content/40 mb-2">
              About Me
            </p>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Focused on craft &amp; clarity
            </h2>
            <p className="text-base-content/60 leading-relaxed mb-4">
              I'm a designer and developer who believes great products come from
              the intersection of strong aesthetics and clean engineering.
            </p>
            <p className="text-base-content/60 leading-relaxed">
              I work across the full stack — from wireframes to deployment —
              helping teams ship products their users love.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              "Next.js", "TypeScript", "Tailwind CSS", "Figma",
              "Node.js", "PostgreSQL", "Framer Motion", "Vercel",
            ].map((skill) => (
              <span key={skill} className="badge badge-outline rounded-full px-4 py-3 text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Contact */}
      <section
        id="contact"
        className="py-24 px-6 max-w-5xl mx-auto w-full text-center"
      >
        <div className="bg-base-200 border border-base-300/50 rounded-3xl py-16 px-8">
          <p className="text-xs uppercase tracking-widest text-base-content/40 mb-3">
            Get In Touch
          </p>
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Let's work together
          </h2>
          <p className="text-base-content/55 max-w-md mx-auto mb-8 leading-relaxed">
            Have a project in mind? I'd love to hear about it. Drop me a message
            and let's build something meaningful.
          </p>
          <a
            href="mailto:hello@canvas.dev"
            className="btn btn-primary rounded-full px-10"
          >
            Say Hello →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-300/40 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-base-content/40">
          <span>© 2026 canvas. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-base-content transition-colors">Twitter</a>
            <a href="#" className="hover:text-base-content transition-colors">GitHub</a>
            <a href="#" className="hover:text-base-content transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
