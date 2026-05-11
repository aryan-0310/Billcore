import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Phone,
  Trash2,
  Edit2,
  Search,
  UserCheck,
  X,
  Lock,
  User,
  Calendar,
  Activity,
  ArrowUpRight,
  ChevronRight,
  MoreVertical,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, setDoc, doc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, handleFirestoreError } from '../lib/firestore-utils';

export default function Staff() {
  const { profile, businessId } = useAuth();
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Unauthorized Access Signal Detected.</div>;
  }

  const [staff, setStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: '',
    dob: '',
    role: 'salesperson' as 'admin' | 'manager' | 'salesperson'
  });

  useEffect(() => {
    if (!businessId) return;
    
    const q = query(collection(db, 'users'), where('parentBusinessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [businessId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !profile) return;
    setIsSubmitting(true);

    try {
      const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newMember.email,
        newMember.password
      );

      await updateProfile(userCredential.user, { displayName: newMember.name });

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: newMember.email,
        displayName: newMember.name,
        dob: newMember.dob,
        role: newMember.role,
        parentBusinessId: businessId,
        businessName: profile.businessName,
        location: profile.location,
        createdAt: new Date().toISOString(),
        isActive: true
      });

      await signOut(secondaryAuth);
      
      setIsAddModalOpen(false);
      setNewMember({ name: '', email: '', password: '', dob: '', role: 'salesperson' });
      alert('Team member added successfully! Access has been provisioned.');
    } catch (error: any) {
      console.error('Error adding team member:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this team member? This will revoke their access to this business node.')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        if (selectedStaff?.id === id) setSelectedStaff(null);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const roles = [
    { id: 'salesperson', label: 'Salesperson (Billing & Customers)', color: 'amber' },
    { id: 'manager', label: 'Manager (Inventory & Reports)', color: 'indigo' },
    { id: 'admin', label: 'Full Admin Control', color: 'emerald' },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 md:px-8 pt-8 pb-6 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel Operations Center</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-3 cursor-default">
              The Team <span className="text-lg font-bold text-slate-300">/ {staff.length} Active Nodes</span>
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
             <div className="relative">
                <Search className="absolute left-4 top-3 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Query personnel..."
                  className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-bold w-full md:w-64 transition-all md:focus:w-80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             {isAdmin && (
               <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                >
                  <UserPlus className="w-4 h-4" />
                  Provision Access
                </button>
             )}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-8 scrollbar-hide">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
             {[
               { label: 'Personnel Count', value: staff.length, sub: 'All business nodes', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
               { label: 'Integrity Rating', value: '98.2%', sub: 'Based on activity', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
               { label: 'Daily Activity', value: '244', sub: 'Invoices created', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
               { label: 'Growth Vector', value: '+12%', sub: 'Since last month', icon: ArrowUpRight, color: 'text-rose-600', bg: 'bg-rose-50' },
             ].map((stat, i) => (
                <div key={i} className="p-6 bg-white rounded-[2rem] border border-slate-100 flex items-center gap-4 group hover:border-slate-200 transition-all cursor-default">
                   <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105", stat.bg)}>
                      <stat.icon className={cn("w-7 h-7", stat.color)} />
                   </div>
                   <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{stat.label}</div>
                      <div className="text-2xl font-black text-slate-900 leading-none">{stat.value}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-1 italic">{stat.sub}</div>
                   </div>
                </div>
             ))}
          </div>

          {/* Directory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <AnimatePresence mode="popLayout">
                {staff
                  .filter(s => s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((member) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={member.id}
                      onClick={() => setSelectedStaff(member)}
                      className={cn(
                        "p-8 bg-white rounded-[2.5rem] border transition-all cursor-pointer group relative overflow-hidden",
                        selectedStaff?.id === member.id ? "border-blue-600 ring-4 ring-blue-50/50" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                       <div className="flex justify-between items-start mb-6">
                          <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-slate-300 uppercase ring-1 ring-slate-100 ring-offset-4 ring-offset-white">
                             {member.displayName?.[0]}
                          </div>
                          <div className="flex gap-1">
                             <span className={cn(
                               "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                               member.role === 'admin' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                             )}>
                               {member.role || 'Staff'}
                             </span>
                          </div>
                       </div>

                       <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors">
                            {member.displayName}
                          </h3>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">{member.email}</p>
                       </div>

                       <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center text-slate-400">
                          <div className="flex items-center gap-1.5">
                             <Briefcase className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-widest">
                               {member.businessName || 'Business Unit'}
                             </span>
                          </div>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </div>

                       {/* Decorative grid */}
                       <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full -z-0"></div>
                    </motion.div>
                  ))
                }
             </AnimatePresence>

             {staff.length === 0 && !isLoading && (
               <div className="col-span-full py-32 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                     <Users className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Empty Registry</h3>
                  <p className="text-slate-400 font-bold text-sm tracking-tight mt-1 capitalize px-2">Start by provisioning access to your first team member.</p>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Side Details Panel */}
      <AnimatePresence>
        {selectedStaff && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-slate-100 shadow-2xl z-[60] flex flex-col"
          >
            <div className="p-10 flex-1 overflow-y-auto scrollbar-hide">
               <button 
                 onClick={() => setSelectedStaff(null)}
                 className="mb-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
               >
                 <X className="w-4 h-4" /> Close Panel
               </button>

               <div className="space-y-12">
                  <div className="flex items-center gap-8">
                     <div className="w-28 h-28 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-blue-200 ring-8 ring-blue-50/50">
                        {selectedStaff.displayName?.[0]}
                     </div>
                     <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2 italic">
                          {selectedStaff.displayName}
                        </h2>
                        <span className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-100">
                          {selectedStaff.role} Perspective
                        </span>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100 pb-3">Metadata Registry</h4>
                     <div className="grid grid-cols-2 gap-8">
                        <div>
                           <label className="text-[9px] font-black uppercase text-slate-300 block mb-1">Signal Protocol</label>
                           <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">{selectedStaff.email}</div>
                        </div>
                        <div>
                           <label className="text-[9px] font-black uppercase text-slate-300 block mb-1">Birth Coordinate</label>
                           <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">{selectedStaff.dob || 'N/A'}</div>
                        </div>
                        <div>
                           <label className="text-[9px] font-black uppercase text-slate-300 block mb-1">Onboarding Date</label>
                           <div className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                              {selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleDateString() : 'Historical Records'}
                           </div>
                        </div>
                        <div>
                           <label className="text-[9px] font-black uppercase text-slate-300 block mb-1">Assigned Node</label>
                           <div className="text-xs font-bold text-slate-900 font-mono tracking-tight uppercase tracking-widest">{selectedStaff.location || 'Remote'}</div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100 pb-3">Communication & Access</h4>
                     <div className="grid grid-cols-1 gap-4">
                        <button className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100 group">
                           <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-white rounded-xl text-slate-400 group-hover:text-blue-600 transition-colors">
                                 <Mail className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                 <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Message</div>
                                 <div className="text-xs font-bold text-slate-900 tracking-tight">Open Secure Channel</div>
                              </div>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600" />
                        </button>
                        
                        <button className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100 group opacity-50 cursor-not-allowed">
                           <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-white rounded-xl text-slate-400">
                                 <Phone className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                 <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signal Audio</div>
                                 <div className="text-xs font-bold text-slate-900 tracking-tight">Encrypted Voice Call</div>
                              </div>
                           </div>
                           <Lock className="w-4 h-4 text-slate-300" />
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            {isAdmin && (
              <div className="p-8 border-t border-slate-100 flex gap-4">
                 <button 
                   onClick={() => handleDeleteMember(selectedStaff.id)}
                   className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                 >
                   <Trash2 className="w-4 h-4" /> Revoke All Access
                 </button>
                 <button className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    <Edit2 className="w-4 h-4" /> Modify Profile
                 </button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl relative overflow-hidden"
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full translate-x-32 -translate-y-32 -z-0"></div>

              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-8 right-8 p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative z-10">
                <div className="mb-10">
                   <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200 mb-6 rotate-3">
                      <UserPlus className="w-8 h-8" />
                   </div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3 italic">Onboard Personnel</h2>
                   <p className="text-sm font-bold text-slate-400 tracking-tight">Provision secure credentials and define access vectors for your new business node.</p>
                </div>

                <form onSubmit={handleAddMember} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Full Identity</label>
                       <div className="relative">
                         <User className="absolute left-5 top-4 text-slate-400 w-4 h-4" />
                         <input
                           type="text"
                           placeholder="Ex: John Doe"
                           required
                           className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                           value={newMember.name}
                           onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                         />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Birth Coordinate</label>
                       <div className="relative">
                         <Calendar className="absolute left-5 top-4 text-slate-400 w-4 h-4" />
                         <input
                           type="date"
                           required
                           className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                           value={newMember.dob}
                           onChange={(e) => setNewMember({ ...newMember, dob: e.target.value })}
                         />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Signal Address (Email)</label>
                     <div className="relative">
                       <Mail className="absolute left-5 top-4 text-slate-400 w-4 h-4" />
                       <input
                         type="email"
                         placeholder="Ex: node@billcore.pulse"
                         required
                         className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                         value={newMember.email}
                         onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                       />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Security Key (Password)</label>
                     <div className="relative">
                       <Lock className="absolute left-5 top-4 text-slate-400 w-4 h-4" />
                       <input
                         type="password"
                         placeholder="Min 6 characters"
                         required
                         minLength={6}
                         className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                         value={newMember.password}
                         onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                       />
                     </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Access Role Definition</label>
                    <div className="max-h-36 overflow-y-auto pr-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {roles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setNewMember({ ...newMember, role: role.id })}
                          className={cn(
                            "w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border flex items-center justify-between group",
                            newMember.role === role.id 
                              ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200 ring-2 ring-slate-900 ring-offset-2" 
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 shadow-sm"
                          )}
                        >
                          <span className="flex items-center gap-3">
                             <div className={cn("w-1.5 h-1.5 rounded-full", newMember.role === role.id ? "bg-white" : "bg-slate-200")}></div>
                             {role.id} Level
                          </span>
                          <span className="text-[8px] opacity-60 font-medium italic lowercase tracking-tight group-hover:opacity-100">{role.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 disabled:opacity-50 mt-6 h-16 flex items-center justify-center gap-3 text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Deploying Vector...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Authorize Personnel Access
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

