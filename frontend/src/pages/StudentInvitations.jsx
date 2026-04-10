import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { HiOutlineAcademicCap, HiOutlineCheckCircle } from 'react-icons/hi2';
import AppShell from '../components/AppShell';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api, { getApiError } from '../lib/api';

export default function StudentInvitations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);

  const loadInvitations = async () => {
    try {
      const { data } = await api.get('/students/invitations');
      setInvitations(data.invitations || []);
    } catch (error) {
      toast.error(getApiError(error, 'Unable to load invitations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const acceptInvitation = async (id) => {
    try {
      const { data } = await api.post(`/students/invitations/${id}/accept`);
      toast.success(data.message || 'Invitation accepted!');
      
      // If the message says they need to complete profile, take them there with the context
      if (data.college_id) {
        navigate('/student/profile', { 
          state: { 
            prefill: { 
              college_id: data.college_id, 
              batch_id: data.batch_id 
            } 
          } 
        });
      } else {
        loadInvitations();
      }
    } catch (error) {
      toast.error(getApiError(error, 'Unable to accept invitation'));
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingScreen label="Checking for invitations…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="th-section">
        <PageHeader
          kicker="Campus Enrollment"
          title="College & Placement Invitations"
          description="View and accept invitations from your college's Career Development Cell to join batches and access campus jobs."
        />
      </section>

      <div className="mx-auto max-w-3xl space-y-6">
        {invitations.length === 0 ? (
          <div className="th-section">
            <EmptyState
              title="No active invitations"
              description="Invitations from your college CDC will appear here. Typically, your college admin sends these to your registered email."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invite) => (
              <article key={invite.id} className="th-section border-indigo-100 bg-indigo-50/10">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm border border-indigo-50">
                    <HiOutlineAcademicCap className="h-8 w-8 text-indigo-500" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-ink">{invite.college?.name}</h3>
                      <StatusBadge status={invite.status} />
                    </div>
                    
                    <p className="mt-1 text-ink-soft">
                      {invite.batch ? (
                        <>Invited to join <strong>{invite.batch.name}</strong> ({invite.batch.department})</>
                      ) : (
                        'Invited to enroll in the digital campus platform'
                      )}
                    </p>
                    
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft">
                      <p>Invited on: {new Date(invite.created_at).toLocaleDateString()}</p>
                      {invite.expires_at && (
                        <p className={new Date(invite.expires_at) < new Date() ? 'text-red-400' : ''}>
                          Expires: {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {invite.status === 'pending' && (
                    <button 
                      className="th-btn-primary whitespace-nowrap"
                      onClick={() => acceptInvitation(invite.id)}
                    >
                      <HiOutlineCheckCircle className="h-4 w-4" />
                      Accept Invitation
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-ink-faint p-6 text-center">
          <p className="text-sm text-ink-soft">
            Don't see your college? Contact your CDC department to ensure they have your correct email address.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
