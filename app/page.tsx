import Footer from "@/components/Footer";
import ProjectGrid from "@/components/ProjectGrid";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow p-8 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">My AI-Powered Portfolio</h1>
        <ProjectGrid />
      </main>
      <Footer />
    </div>
  );
}
