import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, Check, X, Database, Settings, FileText, PhoneCall } from "lucide-react";

// TODO:
// - Add a way to view the transcript of a call
// - Add a way to view the conversation history
// - Add a way to view the call logs
// - Add a way to view the system status
// - Add a way to view the configuration

interface Call {
  id: number;
  phoneNumber: string;
  message: string | null;
  status: string;
  duration: number;
  twilioCallSid: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TranscriptTurn {
  id: number;
  speaker: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface SystemStatus {
  twilio: string;
  openai: string;
  postgres: string;
  webhook: string;
}

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("Hello! This is a test call from the voice agent demo.");
  const [saveCall, setSaveCall] = useState(true);
  const { toast } = useToast();

  // Fetch calls
  const { data: calls, isLoading: callsLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls"],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Fetch system status
  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Call initiation mutation
  const initiateCallMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; message?: string }) => {
      const response = await apiRequest("POST", "/api/calls", data);
      return response.json();
    },
    onSuccess: (call: Call) => {
      setActiveCall(call)
      toast({
        title: "Call initiated successfully",
        description: "The voice call has been started.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      setPhoneNumber("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to initiate call",
        description: error.message || "An error occurred while starting the call.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    initiateCallMutation.mutate({
      phoneNumber: phoneNumber.trim(),
      message: message.trim() || undefined,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-4 w-4 text-emerald-600" />;
      case "in_progress":
      case "ringing":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "failed":
      case "busy":
      case "no-answer":
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Phone className="h-4 w-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Completed</Badge>;
      case "in_progress":
      case "ringing":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">In Progress</Badge>;
      case "failed":
      case "busy":
      case "no-answer":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-emerald-500";
      case "pending":
        return "bg-amber-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };

  // Add WebSocket connection for real-time updates
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [callMetrics, setCallMetrics] = useState({
    turnCount: 0,
    duration: 0
  });

  // WebSocket connection for live transcript
  useEffect(() => {
    // console.log('window.location:', window.location);
    // console.log('window.location.host:', window.location.host);
    // console.log('window.location.hostname:', window.location.hostname);
    // console.log('window.location.port:', window.location.port);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const ws = new WebSocket(`${protocol}//${host}/api/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript_update') {
          // setTranscript(prev => [...prev, data.turn]);
          setTranscript(prev => {
            if (prev.some(turn => turn.id === data.turn.id)) {
              return prev;
            }
            return [...prev, data.turn];
          })
          setCallMetrics({
            turnCount: data.turnCount,
            duration: data.callDuration
          });
        } else if (data.type === 'call_ended' || data.type === 'completed') {
          setActiveCall(null);
          setTranscript([]);
          setCallMetrics({ turnCount: 0, duration: 0 });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    if (!activeCall) {
      setLiveDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setLiveDuration(prev => prev + 1);
    }, 1000)
    
    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [activeCall]);

  const sortedCalls = calls
    ? [...calls].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <PhoneCall className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-slate-800">Voice Agent Demo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-500">Development Mode</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Call Initiator */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 text-blue-600 mr-3" />
                  Initiate Voice Call
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="phoneNumber" className="text-sm font-medium text-slate-700">
                      Phone Number
                    </Label>
                    <div className="mt-2 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Include country code (e.g., +1 for US)</p>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-medium text-slate-700">
                      Test Message (Optional)
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Hello! This is a test call from the voice agent demo."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="saveCall"
                        checked={saveCall}
                        onCheckedChange={(checked) => setSaveCall(checked as boolean)}
                      />
                      <Label htmlFor="saveCall" className="text-sm text-slate-700">
                        Save call to database
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      disabled={initiateCallMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {initiateCallMutation.isPending ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Calling...
                        </>
                      ) : (
                        <>
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Start Call
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Live Transcript */}
            {transcript.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Live Transcript</CardTitle>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-slate-500">
                        Turn {callMetrics.turnCount}
                      </span>
                      <span className="text-sm text-slate-500">
                        {Math.floor(liveDuration / 60)}:{(liveDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {transcript.map((turn, index) => (
                      <div key={index} className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg ${
                          turn.speaker === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          <p className="text-sm">{turn.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(turn.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manual Controls */}
            {activeCall && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Call Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        // End call logic
                        fetch(`/api/calls/${activeCall.id}/end`, { method: 'POST' });
                      }}
                    >
                      End Call
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Send text logic
                        const message = prompt("Enter message to send:");
                        if (message) {
                          fetch(`/api/calls/${activeCall.id}/send-text`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message })
                          });
                        }
                      }}
                    >
                      Send Text
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Call Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Calls</CardTitle>
                  <span className="text-sm text-slate-500">
                    {calls?.length || 0} calls
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {callsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                          <div className="space-y-1">
                            <div className="w-32 h-4 bg-slate-200 rounded"></div>
                            <div className="w-20 h-3 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                        <div className="w-20 h-6 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : calls && calls.length > 0 ? (
                  <div className="space-y-4">
                    {sortedCalls.map((call) => (
                      <div key={call.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            {getStatusIcon(call.status)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{call.phoneNumber}</p>
                            <p className="text-xs text-slate-500">{formatTimeAgo(call.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(call.status)}
                          <span className="text-xs text-slate-500">
                            {call.duration ? `${call.duration}s` : "0s"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Phone className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-sm">No calls initiated yet</p>
                    <p className="text-xs">Start your first call using the form above</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemStatus && Object.entries(systemStatus).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
                        <span className="text-sm text-slate-700 capitalize">{service === 'openai' ? 'OpenAI API' : service}</span>
                      </div>
                      <span className={`text-xs font-medium capitalize ${
                        status === 'connected' ? 'text-emerald-600' : 
                        status === 'pending' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Environment</span>
                    <span className="text-slate-800 font-medium">Development</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Twilio Account</span>
                    <span className="text-slate-800 font-medium font-mono">AC***********</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">OpenAI Model</span>
                    <span className="text-slate-800 font-medium">gpt-4o</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Database</span>
                    <span className="text-slate-800 font-medium">PostgreSQL</span>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <span className="text-sm text-slate-500">Voice Agent Demo v1.0.0</span>
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700">Documentation</a>
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700">GitHub</a>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-slate-400">Built with React + TypeScript</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
