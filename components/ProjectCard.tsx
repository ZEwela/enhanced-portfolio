"use client";

import React, { useState, useEffect } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const projectCardSchema = z.object({
  name: z.string(),
  summary: z.string(),
  technologies: z.array(z.string()),
  deployedUrl: z.string().url(),
  githubUrl: z.string().url(),
  retrospective: z.string(),
});

export const feedbackSchema = z.object({
  author: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  comment: z.string().min(1, "Comment is required"),
});

export type ProjectCardProps = z.infer<typeof projectCardSchema> & {
  projectId: string; // This should be the githubId from your GitHub API
};

export type Feedback = {
  id: string;
  author: string;
  email: string;
  comment: string;
  approved: boolean;
  created_at: string;
  projectId: string;
};

export default function ProjectCard({
  name,
  summary,
  technologies,
  deployedUrl,
  githubUrl,
  retrospective: initialRetrospective,
  projectId,
}: ProjectCardProps) {
  const [supabase] = useState(() => createClient());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Retrospective state
  const [retrospective, setRetrospective] = useState(
    initialRetrospective || ""
  );
  const [retrospectiveError, setRetrospectiveError] = useState("");

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    author: "",
    email: "",
    comment: "",
  });
  const [feedbackError, setFeedbackError] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session?.access_token) {
        await verifyAdminStatus(data.session.access_token);
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.access_token) {
        await verifyAdminStatus(session.access_token);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const verifyAdminStatus = async (token) => {
    try {
      const response = await fetch("/api/admin/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { isAdmin } = await response.json();
        setIsAdmin(isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error verifying admin status:", error);
      setIsAdmin(false);
    }
  };

  // Load feedbacks
  useEffect(() => {
    if (!loading) {
      loadFeedbacks();
    }
  }, [projectId, isAdmin, loading]);

  const loadFeedbacks = async () => {
    try {
      let query = supabase
        .from("project_feedback")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      // Only filter approved if NOT admin
      if (!isAdmin) {
        query = query.eq("approved", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("Error loading feedbacks:", error);
    }
  };

  useEffect(() => {
    loadRetrospective();
  }, [projectId]);

  const loadRetrospective = async () => {
    try {
      const { data, error } = await supabase
        .from("project_retrospectives")
        .select("retrospective")
        .eq("project_id", projectId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // "PGRST116" = no rows found

      if (data?.retrospective) {
        setRetrospective(data.retrospective);
      }
    } catch (error) {
      console.error("Error loading retrospective:", error);
    }
  };

  const handleRetrospectiveChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setRetrospective(value);

    const result = projectCardSchema
      .pick({ retrospective: true })
      .safeParse({ retrospective: value });
    setRetrospectiveError(
      result.success
        ? ""
        : result.error.format().retrospective?._errors[0] || ""
    );
  };

  const handleRetrospectiveSave = async () => {
    if (!isAdmin || retrospectiveError) return;

    try {
      const { error } = await supabase.from("project_retrospectives").upsert(
        {
          project_id: projectId,
          project_name: name,
          retrospective: retrospective,
        },
        { onConflict: "project_id" }
      );

      if (error) throw error;
      alert("Retrospective saved successfully!");
    } catch (error) {
      console.error("Error saving retrospective:", error);
      alert("Error saving retrospective");
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    setFeedbackError("");

    try {
      const result = feedbackSchema.safeParse(feedbackForm);
      if (!result.success) {
        setFeedbackError(result.error.errors[0].message);
        return;
      }

      const { error } = await supabase.from("project_feedback").insert([
        {
          project_id: projectId,
          author: feedbackForm.author,
          email: feedbackForm.email,
          comment: feedbackForm.comment,
          approved: false, // Requires admin approval
        },
      ]);

      if (error) throw error;

      setFeedbackForm({ author: "", email: "", comment: "" });
      setShowFeedbackForm(false);
      alert(
        "Thank you for your feedback! It will be reviewed before being published."
      );
    } catch (error) {
      setFeedbackError(error.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleApproveFeedback = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from("project_feedback")
        .update({ approved: true })
        .eq("id", feedbackId);

      if (error) throw error;
      loadFeedbacks();
    } catch (error) {
      console.error("Error approving feedback:", error);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      const { error } = await supabase
        .from("project_feedback")
        .delete()
        .eq("id", feedbackId);

      if (error) throw error;
      loadFeedbacks();
    } catch (error) {
      console.error("Error deleting feedback:", error);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl shadow-lg p-4 bg-white border">
        Loading...
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-lg p-4 bg-white border">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">{name}</h2>
      <p className="text-sm text-gray-700 mb-2">{summary}</p>
      <p className="text-xs text-gray-500 mb-2">
        Tech: {technologies.join(", ")}
      </p>
      <div className="flex justify-between text-sm text-blue-600 mb-4">
        <a href={deployedUrl} target="_blank" rel="noopener noreferrer">
          Live
        </a>
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </div>

      {/* Retrospective Section */}
      <div className="mb-6">
        <label className="text-l font-semibold text-gray-700 mb-1 block">
          Retrospective:
        </label>
        {isAdmin ? (
          <div>
            <textarea
              className="w-full border rounded-md p-2 text-sm text-gray-800 mb-2"
              rows={4}
              value={retrospective}
              onChange={handleRetrospectiveChange}
              placeholder="Write your retrospective notes here..."
            />
            {retrospectiveError && (
              <p className="text-red-500 text-xs mb-2">{retrospectiveError}</p>
            )}
            <button
              onClick={handleRetrospectiveSave}
              disabled={!!retrospectiveError}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Save Retrospective
            </button>
          </div>
        ) : (
          <>
            {retrospective ? (
              <div className="w-full  bg-gray-50 p-4  shadow-sm">
                <div className="whitespace-pre-line text-gray-800 leading-relaxed text-sm">
                  {retrospective}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No retrospective available for this project yet.
              </p>
            )}
          </>
        )}
      </div>
      {/* Feedback Section */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-700">Feedback</h3>
          <button
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            className="text-blue-600 hover:underline text-sm"
          >
            {showFeedbackForm ? "Cancel" : "Leave Feedback"}
          </button>
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && (
          <form
            onSubmit={handleFeedbackSubmit}
            className="mb-4 p-3 bg-gray-50 rounded-md"
          >
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder="Your name"
                className="border rounded p-2 text-sm text-gray-700"
                value={feedbackForm.author}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, author: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Your email"
                className="border rounded p-2 text-sm text-gray-700"
                value={feedbackForm.email}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, email: e.target.value })
                }
              />
            </div>
            <textarea
              placeholder="Your feedback..."
              className="w-full border rounded p-2 text-sm mb-2 text-gray-700"
              rows={3}
              value={feedbackForm.comment}
              onChange={(e) =>
                setFeedbackForm({ ...feedbackForm, comment: e.target.value })
              }
            />
            {feedbackError && (
              <p className="text-red-500 text-xs mb-2">{feedbackError}</p>
            )}
            <button
              type="submit"
              disabled={submittingFeedback}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        )}

        {/* Feedback List */}
        <div className="space-y-3">
          {feedbacks.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No feedback yet - you can be the first to share your thoughts!
            </p>
          ) : (
            feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="border rounded-md p-3 bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <strong className="text-sm text-gray-500">
                      {feedback.author}
                    </strong>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </span>
                    {isAdmin && (
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs ${
                          feedback.approved
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {feedback.approved ? "Approved" : "Pending"}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {!feedback.approved && (
                        <button
                          onClick={() => handleApproveFeedback(feedback.id)}
                          className="text-green-600 hover:underline text-xs"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFeedback(feedback.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-700">{feedback.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
