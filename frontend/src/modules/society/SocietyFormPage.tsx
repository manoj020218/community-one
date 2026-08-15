import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, MapPin, Building2, BedDouble, CheckCircle2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { terminologyFor } from '../../utils/terminology';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh'];

type Vertical = 'COMMUNITY' | 'HOSTEL';

export function SocietyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({ name: '', address: '', city: '', state: 'Maharashtra', pincode: '', contactPersonName: '', contactMobile: '', contactEmail: '', planCode: 'BASIC', country: 'India' });
  const [vertical, setVertical] = useState<Vertical>('COMMUNITY');
  const terms = terminologyFor(vertical);

  const { data: society } = useQuery({
    queryKey: ['society', id],
    queryFn: () => extractData<any>(api.get(`/societies/${id}`)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (society) {
      setForm({ name: society.name, address: society.address, city: society.city, state: society.state, pincode: society.pincode, contactPersonName: society.contactPersonName, contactMobile: society.contactMobile, contactEmail: society.contactEmail, planCode: society.planCode, country: society.country || 'India' });
      setVertical(society.vertical === 'HOSTEL' ? 'HOSTEL' : 'COMMUNITY');
    }
  }, [society]);

  const set = (field: string) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? api.patch(`/societies/${id}`, data) : api.post('/societies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societies'] });
      toast.success(isEdit ? `${terms.org} updated!` : `${terms.org} created!`);
      navigate('/societies');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, vertical });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={isEdit ? `Edit ${terms.org}` : `Create ${terms.org}`}
        subtitle={isEdit ? `Editing ${society?.name || ''}` : `Register a new ${terms.org.toLowerCase()} on the platform`}
        action={<button onClick={() => navigate('/societies')} className="btn-secondary flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEdit && (
          <div className="card p-6 space-y-3">
            <h3 className="section-title">What are you setting up?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { v: 'COMMUNITY' as Vertical, icon: Building2, label: 'Community / Society', desc: 'Apartments, owners, tenants, maintenance billing' },
                { v: 'HOSTEL' as Vertical, icon: BedDouble, label: 'Hostel', desc: 'Rooms, students, wardens, rent collection' },
              ]).map((opt) => (
                <button key={opt.v} type="button" onClick={() => setVertical(opt.v)}
                  className={cn('p-5 rounded-2xl border-2 text-left transition-all', vertical === opt.v ? 'border-primary-500 bg-primary-50' : 'border-slate-100 hover:border-slate-200')}>
                  <opt.icon className={cn('w-8 h-8 mb-3', vertical === opt.v ? 'text-primary-600' : 'text-slate-400')} />
                  <p className="font-semibold text-slate-900">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                  {vertical === opt.v && <span className="badge badge-green text-xs mt-3 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Selected</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card p-6 space-y-4">
          <h3 className="section-title">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <VoiceInputField label={`${terms.org} Name`} value={form.name} onChange={set('name')} placeholder={vertical === 'HOSTEL' ? 'Sunrise Girls Hostel' : 'Green Valley Society'} required className="sm:col-span-2" />
            <VoiceInputField label="Full Address" value={form.address} onChange={set('address')} placeholder="123 Main Road, Near Park" required className="sm:col-span-2" />
            <VoiceInputField label="City" value={form.city} onChange={set('city')} placeholder="Mumbai" required />
            <div>
              <label className="label">State <span className="text-red-500">*</span></label>
              <select value={form.state} onChange={(e) => set('state')(e.target.value)} className="input" required>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <VoiceInputField label="Pincode" value={form.pincode} onChange={set('pincode')} placeholder="400001" required type="text" />
            <div>
              <label className="label">Plan</label>
              <select value={form.planCode} onChange={(e) => set('planCode')(e.target.value)} className="input">
                {['BASIC','STANDARD','PREMIUM','ENTERPRISE'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="section-title flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> Contact Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <VoiceInputField label="Contact Person Name" value={form.contactPersonName} onChange={set('contactPersonName')} placeholder="Raj Sharma" required />
            <VoiceInputField label="Mobile" value={form.contactMobile} onChange={set('contactMobile')} placeholder="9876543210" required type="tel" />
            <VoiceInputField label="Email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="admin@society.com" required type="email" className="sm:col-span-2" />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {mutation.isPending ? 'Saving...' : isEdit ? `Update ${terms.org}` : `Create ${terms.org}`}
          </button>
          <button type="button" onClick={() => navigate('/societies')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
