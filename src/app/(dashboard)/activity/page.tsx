"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";
import { ActivityLog } from "@/types/database.types";
import { ActivityService } from "@/lib/services/activityService";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { History, Search, Eye, ShieldCheck, Clock } from "lucide-react";

export default function ActivityHistoryPage() {
  const { t, isRtl } = useLanguage();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [viewLog, setViewLog] = useState<ActivityLog | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await ActivityService.fetchLogs();
      setLogs(data);
    } catch (err) {
      console.error("Error loading activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== "all" && log.action !== selectedAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (log.description || "").toLowerCase();
      const tbl = log.table_name.toLowerCase();
      const rec = log.record_id.toLowerCase();
      if (!desc.includes(q) && !tbl.includes(q) && !rec.includes(q)) return false;
    }
    return true;
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "CREATE":
        return "success";
      case "UPDATE":
        return "info";
      case "SOFT_DELETE":
        return "danger";
      case "RESTORE":
        return "warning";
      case "LOGIN":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <History className="w-7 h-7 text-primary" />
            <span>{t.activity.title}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable, cryptographically verifiable audit trail of all pharmacy, transaction, and return mutations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-lg border border-border">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Audit Logs Protected &bull; Read-Only</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity description or record ID..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="SOFT_DELETE">SOFT_DELETE</option>
            <option value="RESTORE">RESTORE</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {t.common.loading}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Clock}
              title="No Audit Logs Found"
              description="Mutations and changes in pharmacies, transactions, and returns will appear here automatically."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">{t.activity.timestamp}</th>
                  <th className="py-3 px-4">{t.activity.action}</th>
                  <th className="py-3 px-4">{t.activity.table}</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">{t.activity.record}</th>
                  <th className="py-3 px-4 text-center">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-foreground">
                      {log.table_name}
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {log.description || "-"}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {log.record_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setViewLog(log)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
                        title="View JSON Diff"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {viewLog && (
        <Modal
          isOpen={!!viewLog}
          onClose={() => setViewLog(null)}
          title={`Audit Payload &bull; ${viewLog.action} (${viewLog.table_name})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/40 rounded-lg">
              <div>
                <span className="text-muted-foreground block">User ID:</span>
                <span className="font-mono font-medium">{viewLog.user_id}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Timestamp:</span>
                <span className="font-mono">{viewLog.created_at}</span>
              </div>
            </div>

            {viewLog.old_data && (
              <div className="space-y-1">
                <span className="font-semibold text-rose-700 dark:text-rose-400 block">
                  Previous Data (Old Snapshot):
                </span>
                <pre className="p-3 bg-secondary rounded-lg font-mono text-[11px] overflow-x-auto max-h-48 border border-border">
                  {JSON.stringify(viewLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {viewLog.new_data && (
              <div className="space-y-1">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">
                  New Data (Applied Mutation):
                </span>
                <pre className="p-3 bg-secondary rounded-lg font-mono text-[11px] overflow-x-auto max-h-48 border border-border">
                  {JSON.stringify(viewLog.new_data, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewLog(null)}>
                {t.common.back}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
