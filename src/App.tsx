import { Brain, Languages, Mic, Pause, Play, StopCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { generateResponse, transcribeAudio } from './lib/groq';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
          const transcribedText = await transcribeAudio(audioBlob);
          setTranscript(transcribedText);
          
          const aiResponse = await generateResponse(transcribedText);
          setResponse(aiResponse);
          
          // Automatically speak the response
          const utterance = new SpeechSynthesisUtterance(aiResponse);
          utterance.lang = 'ta-IN';
          utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentUtterance(null);
          };
          setCurrentUtterance(utterance);
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
        } catch (error) {
          console.error('Error processing audio:', error);
          const errorMessage = 'மன்னிக்கவும், ஏதோ தவறு நேர்ந்துவிட்டது.';
          setResponse(errorMessage);
          
          // Speak error message
          const utterance = new SpeechSynthesisUtterance(errorMessage);
          utterance.lang = 'ta-IN';
          utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentUtterance(null);
          };
          setCurrentUtterance(utterance);
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
        }
        setIsProcessing(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscript('');
      setResponse('');
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const pauseSpeech = () => {
    if (currentUtterance) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
    }
  };

  const resumeSpeech = () => {
    if (currentUtterance) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentUtterance(null);
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Pinterest image background */}
      <div className="absolute inset-0 bg-[url('https://i.pinimg.com/736x/0a/26/91/0a2691f0e6012a769fa8574912b8b26c.jpg')] bg-cover bg-center"></div>
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md"></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">தமிழ் பேசும் உதவியாளர்</h1>
          <p className="text-xl text-gray-100">Tamil Speech Assistant</p>
        </header>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 shadow-xl">
            <div className="flex justify-center mb-8">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-blue-600 hover:bg-blue-500'
                } transition-all duration-300 rounded-full p-6 shadow-lg`}
                disabled={isProcessing}
              >
                {isRecording ? (
                  <StopCircle className="w-12 h-12" />
                ) : (
                  <Mic className="w-12 h-12" />
                )}
              </button>
            </div>

            <div className="space-y-6">
              {isProcessing && (
                <div className="flex items-center justify-center space-x-2 animate-pulse">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                </div>
              )}

              {transcript && (
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Languages className="w-5 h-5 text-blue-300" />
                    <span className="text-sm text-blue-300">Transcription</span>
                  </div>
                  <p className="text-lg text-white">{transcript}</p>
                </div>
              )}

              {response && (
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-green-300" />
                    <span className="text-sm text-green-300">Response</span>
                  </div>
                  <p className="text-lg text-white">{response}</p>
                  <div className="mt-4 flex items-center justify-between bg-white/20 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-sm text-gray-200">
                      <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                      {isSpeaking ? 'Playing' : currentUtterance ? 'Paused' : ''}
                    </div>
                    <div className="flex gap-2">
                      {isSpeaking ? (
                        <button
                          onClick={pauseSpeech}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
                          title="Pause speech"
                        >
                          <Pause className="w-4 h-4" />
                          <span>Pause</span>
                        </button>
                      ) : currentUtterance ? (
                        <button
                          onClick={resumeSpeech}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
                          title="Resume speech"
                        >
                          <Play className="w-4 h-4" />
                          <span>Play</span>
                        </button>
                      ) : null}
                      {currentUtterance && (
                        <button
                          onClick={stopSpeech}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors"
                          title="Stop speech"
                        >
                          <StopCircle className="w-4 h-4" />
                          <span>Stop</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-200">
            <p>Click the microphone button and speak in Tamil</p>
            <p>பேச மைக் பொத்தானை அழுத்தவும்</p>
          </div>
        </div>
      </div>
      
      <footer className="py-4 text-center text-xs text-gray-300 relative z-10">
        Created by Preetam Tony J ✨
      </footer>
    </div>
  );
}

export default App;
