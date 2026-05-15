import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Activity, Archive, CheckCircle, AlertTriangle, Clock, PlayCircle } from "lucide-react";

export default function ExperimentsPage() {
  const { data: staticResults, isLoading: loadingStatic } = useQuery({
    queryKey: ["static-results"],
    queryFn: () => axios.get("/api/results/static").then((r) => r.data),
  });

  const { data: liveExperiments, isLoading: loadingLive } = useQuery({
    queryKey: ["live-experiments"],
    queryFn: () => axios.get("/api/experiments/").then((r) => r.data),
    refetchInterval: 3000,
  });

  if (loadingStatic && loadingLive) return <ExperimentsSkeleton />;

  return (
    <div className="w-full space-y-8 pb-10 text-gray-200">
      
      <div className="border-b border-gray-700/50 pb-5 mb-6 pt-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">
          Experiment <span className="text-blue-500">Results</span>
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Detailed logs and metrics for both live executions and pre-recorded study data.
        </p>
      </div>

      {liveExperiments && liveExperiments.length > 0 && (
        <div className="bg-[#1e293b] rounded-lg border border-gray-700/50 shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-700/50 bg-[#1e293b] flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Live Executed Experiments</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#0f172a]/50 text-gray-400 uppercase text-xs font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">DBMS</th>
                  <th className="px-6 py-4">Oracle</th>
                  <th className="px-6 py-4">Queries</th>
                  <th className="px-6 py-4">Throughput</th>
                  <th className="px-6 py-4">Success Rate</th>
                  <th className="px-6 py-4">Bugs Found</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {liveExperiments.map((r: any) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-800/40 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{r.id}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-200">{r.dbms}</td>
                    <td className="px-6 py-4">{r.oracle}</td>
                    <td className="px-6 py-4">
                      {r.total_queries_executed?.toLocaleString() || "—"}
                    </td>
                    <td className="px-6 py-4 text-blue-400 font-medium">
                      {r.throughput_qps
                        ? `${r.throughput_qps.toLocaleString()} q/s`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {r.success_rate
                        ? `${(r.success_rate * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          r.bugs_found > 0
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-700/50 text-gray-400"
                        }`}
                      >
                        {r.bugs_found ?? "0"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-[#1e293b] rounded-lg border border-gray-700/50 shadow-md overflow-hidden">
        <div className="p-5 border-b border-gray-700/50 bg-[#1e293b] flex items-center gap-3">
          <Archive className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Static Results (Pre-recorded)</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#0f172a]/50 text-gray-400 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Exp</th>
                <th className="px-6 py-4">DBMS</th>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4">Oracle</th>
                <th className="px-6 py-4">Total Queries</th>
                <th className="px-6 py-4">Throughput</th>
                <th className="px-6 py-4">Success Rate</th>
                <th className="px-6 py-4">Bugs</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {staticResults?.map((r: any) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-800/40 transition-colors duration-150"
                >
                  <td className="px-6 py-4 font-medium text-gray-300">{r.experiment}</td>
                  <td className="px-6 py-4 font-bold text-gray-200">{r.dbms}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{r.version}</td>
                  <td className="px-6 py-4">{r.oracle}</td>
                  <td className="px-6 py-4">
                    {r.total_queries.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-blue-400 font-medium">
                    {r.throughput_qps.toLocaleString()} q/s
                  </td>
                  <td className="px-6 py-4">
                    {(r.success_rate * 100).toFixed(0)}%
                  </td>
                  <td className="px-6 py-4">
                    <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          r.bugs_found > 0
                            ? "bg-red-500/20 text-red-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {r.bugs_found}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {r.bug_type || "—"}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                    {r.observations || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    running: { 
      color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", 
      icon: <PlayCircle className="w-3.5 h-3.5 mr-1.5 animate-pulse" /> 
    },
    completed: { 
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", 
      icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> 
    },
    error: { 
      color: "bg-red-500/10 text-red-400 border-red-500/20", 
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> 
    },
    timeout: { 
      color: "bg-orange-500/10 text-orange-400 border-orange-500/20", 
      icon: <Clock className="w-3.5 h-3.5 mr-1.5" /> 
    },
    pending: { 
      color: "bg-gray-500/10 text-gray-400 border-gray-500/20", 
      icon: <Clock className="w-3.5 h-3.5 mr-1.5" /> 
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}>
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ExperimentsSkeleton() {
  return (
    <div className="w-full space-y-8 animate-pulse pb-10 mt-6">
      <div className="h-10 w-64 bg-gray-700 rounded-md mb-8"></div>
      
      <div className="bg-[#1e293b] rounded-lg h-96 border border-gray-700/50">
        <div className="h-14 border-b border-gray-700/50 bg-gray-800/50 rounded-t-lg"></div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="h-8 bg-gray-700/50 rounded w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}