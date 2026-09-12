import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import IntakeQueue from './components/IntakeQueue';
import IntakeDetail from './components/IntakeDetail';
import NewIntakeModal from './components/NewIntakeModal';

export default function App() {
  const [intakes, setIntakes] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedIntakeId, setSelectedIntakeId] = useState(null);
  const [selectedIntake, setSelectedIntake] = useState(null);
  
  // Filters
  const [tabFilter, setTabFilter] = useState('ALL'); // 'ALL' | 'FLAGGED' | 'CLEAN'
  const [serviceFilter, setServiceFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState(''); // '' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Remove any legacy dark mode class or setting
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  // Fetch Services Catalog
  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error('Error fetching services:', err));
  }, []);

  // Fetch Intakes Queue
  const fetchIntakes = () => {
    setIsLoadingList(true);
    let url = '/api/intakes?';
    if (tabFilter === 'FLAGGED') url += 'tab=REVIEW_NEEDED&';
    else if (tabFilter === 'CLEAN') url += 'tab=AWAITING_CONFIRMATION&';
    else if (tabFilter === 'APPROVED') url += 'tab=APPROVED&';
    else if (tabFilter === 'REJECTED') url += 'tab=REJECTED&';
    if (serviceFilter) url += `service_id=${encodeURIComponent(serviceFilter)}&`;
    if (urgencyFilter) url += `urgency=${encodeURIComponent(urgencyFilter)}&`;
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setIntakes(data);
        setIsLoadingList(false);
        if (data.length > 0 && !selectedIntakeId) {
          setSelectedIntakeId(data[0].id);
        }
      })
      .catch(err => {
        console.error('Error fetching intakes:', err);
        setIsLoadingList(false);
      });
  };

  useEffect(() => {
    fetchIntakes();
  }, [tabFilter, serviceFilter, urgencyFilter, searchQuery]);

  // Fetch Selected Intake Detail
  useEffect(() => {
    if (!selectedIntakeId) {
      setSelectedIntake(null);
      return;
    }
    setIsLoadingDetail(true);
    fetch(`/api/intakes/${selectedIntakeId}`)
      .then(res => res.json())
      .then(data => {
        setSelectedIntake(data);
        setIsLoadingDetail(false);
      })
      .catch(err => {
        console.error('Error fetching intake detail:', err);
        setIsLoadingDetail(false);
      });
  }, [selectedIntakeId]);

  // Seed 4 Sample Transcripts
  const handleSeedSamples = async () => {
    setIsSeeding(true);
    try {
      await fetch('/api/seed', { method: 'POST' });
      fetchIntakes();
    } catch (err) {
      console.error('Error seeding transcripts:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Process Custom Intake (Text)
  const handleProcessIntake = async (transcriptText) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/intakes/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Failed to process intake');
        return;
      }
      setIsModalOpen(false);
      fetchIntakes();
      setSelectedIntakeId(data.id);
    } catch (err) {
      console.error('Error processing intake:', err);
      alert('Error connecting to server to process intake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process Custom Intake (Audio Voicemail / File)
  const handleProcessAudioIntake = async (audioFile) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', audioFile);

      const res = await fetch('/api/intakes/process-audio', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Failed to process audio voicemail intake');
        return;
      }
      setIsModalOpen(false);
      fetchIntakes();
      setSelectedIntakeId(data.id);
    } catch (err) {
      console.error('Error processing audio intake:', err);
      alert('Error connecting to server to process audio file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (intakeId, newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/intakes/${intakeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Failed to update status');
        return;
      }
      setSelectedIntake(data);
      fetchIntakes();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Intake
  const handleDeleteIntake = async (intakeId) => {
    try {
      await fetch(`/api/intakes/${intakeId}`, { method: 'DELETE' });
      // Optimistically update list
      setIntakes(prev => {
        const remaining = prev.filter(item => item.id !== intakeId);
        if (selectedIntakeId === intakeId) {
          setSelectedIntakeId(remaining.length > 0 ? remaining[0].id : null);
          setSelectedIntake(null);
        }
        return remaining;
      });
      fetchIntakes();
    } catch (err) {
      console.error('Error deleting intake:', err);
    }
  };

  // Add/Update Service Match on Intake
  const handleAddService = async (intakeId, serviceId, matchType, rationale) => {
    try {
      const res = await fetch(`/api/intakes/${intakeId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          match_type: matchType,
          rationale: rationale || `Manually added by reviewer.`
        })
      });
      const data = await res.json();
      setSelectedIntake(data);
      fetchIntakes();
    } catch (err) {
      console.error('Error adding service match:', err);
    }
  };

  // Remove Service Match from Intake
  const handleRemoveService = async (intakeId, serviceId) => {
    try {
      const res = await fetch(`/api/intakes/${intakeId}/services/${serviceId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      setSelectedIntake(data);
      fetchIntakes();
    } catch (err) {
      console.error('Error removing service match:', err);
    }
  };

  return (
    <div className="min-h-screen h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 overflow-hidden">
      {/* Top Header with Brand Logo & Actions */}
      <Header
        onSeedSamples={handleSeedSamples}
        onOpenNewModal={() => setIsModalOpen(true)}
        isSeeding={isSeeding}
      />

      {/* Main Dashboard Content (Full Width) */}
      <main className="flex-1 p-5 xl:p-6 overflow-hidden min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 h-full min-h-0">
          {/* Left Column: Intake Queue Table (7 cols on laptops, 6 on 2XL) */}
          <div className="lg:col-span-7 2xl:col-span-6 h-full min-h-0 flex flex-col">
            <IntakeQueue
              intakes={intakes}
              selectedIntakeId={selectedIntakeId}
              onSelectIntake={(id) => setSelectedIntakeId(id)}
              onDeleteIntake={handleDeleteIntake}
              tabFilter={tabFilter}
              setTabFilter={setTabFilter}
              serviceFilter={serviceFilter}
              setServiceFilter={setServiceFilter}
              urgencyFilter={urgencyFilter}
              setUrgencyFilter={setUrgencyFilter}
              services={services}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenNewModal={() => setIsModalOpen(true)}
              isLoading={isLoadingList}
            />
          </div>

          {/* Right Column: Intake Detail View (5 cols on laptops, 6 on 2XL) */}
          <div className="lg:col-span-5 2xl:col-span-6 h-full min-h-0 flex flex-col">
            <IntakeDetail
              intake={selectedIntake}
              services={services}
              onUpdateStatus={handleUpdateStatus}
              onDeleteIntake={handleDeleteIntake}
              onAddService={handleAddService}
              onRemoveService={handleRemoveService}
              isUpdating={isUpdatingStatus}
            />
          </div>
        </div>
      </main>

      {/* Process New Intake Modal */}
      <NewIntakeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleProcessIntake}
        onSubmitAudio={handleProcessAudioIntake}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
