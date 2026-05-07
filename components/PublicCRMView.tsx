import React, { useState, useEffect } from 'react';
import { CRMContact, CRMInteraction } from '../types';
import { crmService } from '../services/crmService';
import { clientService } from '../services/clientService';
import { Loader2, Users, Briefcase, Calendar, MessageSquare, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';

export const PublicCRMView: React.FC<{ clientId: string }> = ({ clientId }) => {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Em um app de produção com RLS, you need anonymous read access on RPC or client specific rule
        // Simplification for the public view demo:
        const clientData = await clientService.getClients('2000-01-01', '2100-01-01');
        const theClient = clientData.find(c => c.id === clientId);
        if (theClient) setClientName(theClient.name);

        const fetchedContacts = await crmService.getContacts(clientId);
        setContacts(fetchedContacts);

        if (fetchedContacts.length > 0) {
            let allInts: CRMInteraction[] = [];
            for (const c of fetchedContacts) {
                const ints = await crmService.getInteractions(c.id);
                allInts = [...allInts, ...ints];
            }
            setInteractions(allInts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      } catch (err) {
        console.error("Public CRM Load error", err);
        toast.error("Erro ao carregar dados do CRM.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <div>
             <h1 className="text-2xl font-bold text-slate-800">Public CRM</h1>
             <p className="text-slate-500 mt-1">Client: {clientName || '...'} <span className="text-xs ml-2 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">{clientId}</span></p>
           </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                 <Users size={20} className="text-indigo-600" />
                 Contacts ({contacts.length})
             </h2>
             {contacts.length === 0 ? <p className="text-slate-500">No contacts.</p> : (
                 <ul className="space-y-4">
                     {contacts.map(c => (
                         <li key={c.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800">{c.name}</h3>
                                <p className="text-sm text-slate-500">{c.email} • {c.phone}</p>
                                <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${c.status === 'customer' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                            </div>
                         </li>
                     ))}
                 </ul>
             )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                 <MessageSquare size={20} className="text-teal-600" />
                 Interactions ({interactions.length})
             </h2>
             {interactions.length === 0 ? <p className="text-slate-500">No interactions.</p> : (
                 <ul className="space-y-4">
                     {interactions.map(i => {
                         const contactName = contacts.find(c => c.id === i.contact_id)?.name || 'Unknown';
                         return (
                            <li key={i.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                               <div className="flex justify-between items-start mb-2">
                                   <h3 className="font-bold text-slate-800 text-sm">Interaction with {contactName}</h3>
                                   <span className="text-xs text-slate-400">{new Date(i.date).toLocaleDateString()}</span>
                               </div>
                               <p className="text-sm text-slate-600">{i.description}</p>
                            </li>
                         )
                     })}
                 </ul>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
