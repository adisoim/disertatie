import { useState, useEffect } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { 
  Database, 
  Search, 
  Clock, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";

export default function RunPage() {
  const [dbmsList, setDbmsList] = useState<any>({});
  
  const [config, setConfig] = useState({
    dbms: "sqlite3", 
    oracle: "TLP_WHERE",
    num_queries: 100000,
    num_threads: 4,
    duration_seconds: 300,
  });
  
  const [availableOracles, setAvailableOracles] = useState<string[]>([]);
  
  const [status, setStatus] = useState<{ type: 'idle' | 'running' | 'success' | 'error', text: string }>({ 
    type: 'idle', 
    text: '' 
  });
  
  const [activeExpId, setActiveExpId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    axios.get("/api/experiments/available-dbms").then((res) => {
      const dbmsData = res.data.dbms_details || {};
      setDbmsList(dbmsData);
      
      const firstDbms = Object.keys(dbmsData)[0];
      if (firstDbms && !dbmsData[config.dbms]) {
          setConfig((prev) => ({ ...prev, dbms: firstDbms }));
      }
    });
  }, []);

  useEffect(() => {
    if (dbmsList[config.dbms]) {
      const oracles = dbmsList[config.dbms].oracles || [];
      setAvailableOracles(oracles);
      
      if (oracles.length > 0 && !oracles.includes(config.oracle)) {
        setConfig((prev) => ({ ...prev, oracle: oracles[0] }));
      }
    }
  }, [config.dbms, dbmsList]);

  const { data: activeExp } = useQuery({
    queryKey: ["experiment", activeExpId],
    queryFn: () => axios.get(`/api/experiments/${activeExpId}`).then((r) => r.data),
    enabled: !!activeExpId && isPolling,
    refetchInterval: isPolling ? 2000 : false,
  });

  useEffect(() => {
    if (activeExp && isPolling) {
      if (activeExp.status !== "running") {
        setIsPolling(false); 
        if (activeExp.status === "error") {
          setStatus({ type: 'error', text: `Experiment failed or encountered an error.` });
        } else {
          setStatus({ type: 'success', text: `Experiment [${activeExpId}] completed successfully!` });
        }
      }
    }
  }, [activeExp, isPolling, activeExpId]);

  const handleRun = async () => {
    try {
      setStatus({ type: 'running', text: 'Experiment is running in the background. Please wait...' });
      setActiveExpId(null);
      setIsPolling(false);
      
      const res = await axios.post("/api/experiments/", config);
      
      if (res.data.error) {
        setStatus({ type: 'error', text: res.data.error });
      } else {
        setActiveExpId(res.data.id);
        setIsPolling(true);
      }
    } catch (e: any) {
      setStatus({ type: 'error', text: e.message || "An unexpected error occurred." });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-10 text-gray-200 mt-6">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">
          Run <span className="text-blue-500">Experiment</span>
        </h1>
        <p className="mt-3 text-sm text-gray-400">
          Configure and launch a new SQLancer fuzzing instance.
        </p>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-gray-700/50 shadow-xl p-6 md:p-8">
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Target DBMS Engine
            </label>
            <select
              value={config.dbms}
              onChange={(e) => setConfig({ ...config, dbms: e.target.value })}
              className="w-full bg-[#0f172a] border border-gray-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {Object.keys(dbmsList).map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 text-purple-400" />
              Testing Oracle
            </label>
            <select
              value={config.oracle}
              onChange={(e) => setConfig({ ...config, oracle: e.target.value })}
              className="w-full bg-[#0f172a] border border-gray-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {availableOracles.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            {availableOracles.length === 0 && (
              <p className="flex items-center gap-1.5 text-red-400 text-xs mt-2 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                No oracles available for this engine.
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4 text-orange-400" />
              Duration (seconds)
            </label>
            <input
              type="number"
              min="1"
              value={config.duration_seconds}
              onChange={(e) =>
                setConfig({
                  ...config,
                  duration_seconds: parseInt(e.target.value) || 0,
                })
              }
              className="w-full bg-[#0f172a] border border-gray-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700/50">
          <button
            onClick={handleRun}
            disabled={availableOracles.length === 0 || status.type === 'running'}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg px-6 py-3.5 font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.99]"
          >
            {status.type === 'running' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
            {status.type === 'running' ? "Running Experiment..." : "Launch Fuzzer"}
          </button>
        </div>

        {status.type !== 'idle' && (
          <div className={`mt-6 p-4 rounded-lg border ${
            status.type === 'running' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
            status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              {status.type === 'running' && <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
              {status.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {status.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
              <p className="text-sm font-medium">{status.text}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}