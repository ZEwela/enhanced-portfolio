import { summarizeReadme } from "./summarizer";

const token = process.env.GITHUB_TOKEN;

const summaryCache: Record<string, any> = {};

export async function getGitHubProjects() {
  const res = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    const errorDetails = await res.text();
    throw new Error(`GitHub API error: ${res.status} - ${errorDetails}`);
  }

  const repos = await res.json();

  if (!Array.isArray(repos)) {
    throw new Error("Expected an array of repositories from GitHub.");
  }

  const filtered = repos.filter((repo: any) =>
    repo.description?.includes("#portfolio")
  );

  const results = await Promise.all(
    filtered.map(async (repo: any) => {
      if (summaryCache[repo.full_name]) {
        return summaryCache[repo.full_name];
      }
      try {
        const readmeRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/readme`,
          {
            headers: {
              Accept: "application/vnd.github.v3.raw",
              Authorization: `Bearer ${token}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );

        const readme = readmeRes.ok
          ? await readmeRes.text()
          : "README not found.";
        const summary = await summarizeReadme(readme);

        const result = {
          name: repo.name,
          summary: summary.text,
          technologies: summary.techStack,
          deployedUrl: summary.deployedUrl,
          githubUrl: repo.html_url,
        };
        summaryCache[repo.full_name] = result;
        return result;
      } catch (error) {
        console.error(`Error processing repo ${repo.name}:`, error);
        return null;
      }
    })
  );

  return results.filter(Boolean); // Remove nulls from failed repos
}
