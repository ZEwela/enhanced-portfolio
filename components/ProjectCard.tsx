interface Props {
  name: string;
  summary: string;
  technologies: string[];
  deployedUrl: string;
  githubUrl: string;
}

export default function ProjectCard({
  name,
  summary,
  technologies,
  deployedUrl,
  githubUrl,
}: Props) {
  return (
    <div className="rounded-2xl shadow-lg p-4 bg-white border">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">{name}</h2>
      <p className="text-sm text-gray-700 mb-2">{summary}</p>
      <p className="text-xs text-gray-500 mb-2">
        Tech: {technologies.join(", ")}
      </p>
      <div className="flex justify-between text-sm text-blue-600">
        <a href={deployedUrl} target="_blank" rel="noopener noreferrer">
          Live
        </a>
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </div>
    </div>
  );
}
