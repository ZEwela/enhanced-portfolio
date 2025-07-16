"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type FeedbackWithProject = {
  id: string;
  project_id: string;
  author: string;
  email: string;
  comment: string;
  approved: boolean;
  created_at: string;
};

export default function AdminPanel() {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<FeedbackWithProject[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">(
    "pending"
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsAdmin(
        data.session?.user?.email
          ? process.env.NEXT_PUBLIC_ADMIN_EMAILS!.includes(
              data.session.user.email
            )
          : false
      );
      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAdmin(
        session?.user?.email
          ? process.env.NEXT_PUBLIC_ADMIN_EMAILS!.includes(session.user.email)
          : false
      );
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) {
      loadFeedbacks();
    }
  }, [isAdmin, filter]);

  const loadFeedbacks = async () => {
    try {
      let query = supabase
        .from("project_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.eq("approved", false);
      } else if (filter === "approved") {
        query = query.eq("approved", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("Error loading feedbacks:", error);
    }
  };

  const handleApprove = async (feedbackId: string) => {
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

  const handleDelete = async (feedbackId: string) => {
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

  const handleBulkApprove = async () => {
    const pendingIds = feedbacks.filter((f) => !f.approved).map((f) => f.id);

    if (pendingIds.length === 0) return;

    if (!confirm(`Approve ${pendingIds.length} pending feedback(s)?`)) return;

    try {
      const { error } = await supabase
        .from("project_feedback")
        .update({ approved: true })
        .in("id", pendingIds);

      if (error) throw error;
      loadFeedbacks();
    } catch (error) {
      console.error("Error bulk approving:", error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">
          Access denied. Admin privileges required.
        </p>
      </div>
    );
  }

  const pendingCount = feedbacks.filter((f) => !f.approved).length;
  const approvedCount = feedbacks.filter((f) => f.approved).length;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Feedback Management
        </h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            {pendingCount} Pending
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            {approvedCount} Approved
          </span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded text-sm ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All ({feedbacks.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded text-sm ${
              filter === "pending"
                ? "bg-yellow-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-4 py-2 rounded text-sm ${
              filter === "approved"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Approved ({approvedCount})
          </button>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleBulkApprove}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Approve All Pending
          </button>
        )}
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbacks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No feedback found.</p>
        ) : (
          feedbacks.map((feedback) => (
            <div key={feedback.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="text-sm">{feedback.author}</strong>
                    <span className="text-xs text-gray-500">
                      ({feedback.email})
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        feedback.approved
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {feedback.approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Project: {feedback.project_id} •
                    {new Date(feedback.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!feedback.approved && (
                    <button
                      onClick={() => handleApprove(feedback.id)}
                      className="text-green-600 hover:underline text-sm"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(feedback.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                {feedback.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
