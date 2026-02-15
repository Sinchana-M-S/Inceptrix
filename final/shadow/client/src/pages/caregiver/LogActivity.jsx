import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { activitiesAPI } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import VoiceInput from '../../components/VoiceInput';
import { 
  Mic, MicOff, Send, Clock, Calendar, MapPin,
  CheckCircle, Baby, Users, Home, HeartHandshake
} from 'lucide-react';

const LogActivity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    rawText: '',
    reportedHours: '',
    activityDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [nlpResult, setNlpResult] = useState(null);

  const templates = [
    { icon: Users, label: 'Elder Care', text: 'Took care of elderly family member today. Helped with bathing, gave medicines, and prepared meals.', color: 'success' },
    { icon: Baby, label: 'Childcare', text: 'Looked after the children today. Helped with homework, prepared meals, and supervised playtime.', color: 'info' },
    { icon: Home, label: 'Housework', text: 'Completed household chores today. Cleaned the house, washed clothes, and organized kitchen.', color: 'warning' },
    { icon: HeartHandshake, label: 'Community', text: 'Participated in community activities. Helped neighbors with tasks and attended local meetings.', color: 'primary' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await activitiesAPI.create(formData);
      setNlpResult(res.data.nlpAnalysis);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error logging activity');
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = (template) => {
    setFormData({ ...formData, rawText: template.text });
  };

  // Handle voice transcription result
  const handleVoiceTranscription = (text) => {
    setFormData({ ...formData, rawText: text });
    setShowVoiceInput(false);
  };

  if (success) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar role="caregiver" />
        <main className="main-content">
          <TopHeader title="Log Activity" subtitle="Record your caregiving work" />
          <div className="page-content">
            <div className="card" style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center' }}>
              <div className="card-body" style={{ padding: '3rem' }}>
                <div style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  background: '#dcfce7', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem'
                }}>
                  <CheckCircle size={40} style={{ color: '#22c55e' }} />
                </div>
                <h2 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Activity Logged!</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Your activity has been recorded successfully.</p>
                
                {nlpResult && (
                  <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>AI Analysis</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{nlpResult.type}</span>
                      <span style={{ color: '#22c55e', fontWeight: 500 }}>{nlpResult.estimatedHours}h estimated</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Confidence: {Math.round(nlpResult.confidence * 100)}%
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setFormData({ rawText: '', reportedHours: '', activityDate: new Date().toISOString().split('T')[0] });
                      setNlpResult(null);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Log Another
                  </button>
                  <button onClick={() => navigate('/caregiver')} className="btn btn-primary" style={{ flex: 1 }}>
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="caregiver" />
      <main className="main-content">
        <TopHeader title="Log Activity" subtitle="Record your caregiving work" />
        
        <div className="page-content">
          {/* Templates */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Quick Templates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {templates.map((template, i) => (
                <button
                  key={i}
                  onClick={() => useTemplate(template)}
                  className="card"
                  style={{ cursor: 'pointer', border: 'none', textAlign: 'left' }}
                >
                  <div className="card-body" style={{ padding: '1rem' }}>
                    <div className={`stat-icon ${template.color}`} style={{ width: 40, height: 40, marginBottom: '0.75rem' }}>
                      <template.icon size={20} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{template.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Activity Details</h3>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Voice Input Panel */}
                {showVoiceInput && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <VoiceInput 
                      onTranscription={handleVoiceTranscription}
                      language="hi"
                      placeholder="माइक बटन पर क्लिक करके बोलें..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowVoiceInput(false)}
                      className="btn btn-secondary"
                      style={{ marginTop: '0.5rem', width: '100%' }}
                    >
                      Cancel Voice Input
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">What did you do today?</label>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={formData.rawText}
                      onChange={(e) => setFormData({ ...formData, rawText: e.target.value })}
                      rows={5}
                      className="form-input"
                      style={{ resize: 'none', paddingRight: '3rem' }}
                      placeholder="Describe your caregiving activities in your own words..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowVoiceInput(true)}
                      title="Voice Input"
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        width: 36,
                        height: 36,
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: showVoiceInput ? '#d4a853' : '#f1f5f9',
                        color: showVoiceInput ? 'white' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Mic size={18} />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                    🎤 Click the mic button to speak in Hindi, Tamil, Telugu, and other Indian languages
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Hours Spent</label>
                    <div className="form-input-icon">
                      <Clock size={20} />
                      <input
                        type="number"
                        value={formData.reportedHours}
                        onChange={(e) => setFormData({ ...formData, reportedHours: e.target.value })}
                        className="form-input"
                        placeholder="Optional"
                        min="0.5"
                        max="24"
                        step="0.5"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Activity Date</label>
                    <div className="form-input-icon">
                      <Calendar size={20} />
                      <input
                        type="date"
                        value={formData.activityDate}
                        onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
                        className="form-input"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MapPin size={20} style={{ color: '#64748b' }} />
                    <div>
                      <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>Location</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user?.region || 'Not set'}</div>
                    </div>
                  </div>
                  <span className="badge badge-success">Privacy Protected</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={loading || !formData.rawText}
                >
                  {loading ? 'Submitting...' : <><Send size={18} /> Log Activity</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LogActivity;
