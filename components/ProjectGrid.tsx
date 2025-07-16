import { getGitHubProjects } from "@/utilis/github";
import ProjectCard from "./ProjectCard";

export default async function ProjectGrid() {
  const projects = await getGitHubProjects();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.githubId} {...project} />
      ))}
    </div>
  );
}
