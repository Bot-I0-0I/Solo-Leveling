import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db as cloudDb } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, onSnapshot, setDoc, arrayUnion, deleteDoc, writeBatch } from 'firebase/firestore';
import { Users, Search, UserPlus, Check, X, Shield, Activity, Swords } from 'lucide-react';
import { getRank } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { db as localDb } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { differenceInMinutes } from 'date-fns';

const isOnline = (lastActive?: string) => {
  if (!lastActive) return false;
  return differenceInMinutes(new Date(), new Date(lastActive)) < 5;
};

export function FriendsView() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  
  const userStats = useLiveQuery(() => localDb.userStats.get(1));
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  useEffect(() => {
    if (!user) return;

    // Listen for incoming friend requests
    const qIncoming = query(
      collection(cloudDb, 'friendRequests'),
      where('toUid', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeIncoming = onSnapshot(qIncoming, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncomingRequests(reqs);
    });

    // Listen for outgoing friend requests
    const qOutgoing = query(
      collection(cloudDb, 'friendRequests'),
      where('fromUid', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeOutgoing = onSnapshot(qOutgoing, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOutgoingRequests(reqs);
    });

    // Listen for accepted outgoing friend requests
    const qAccepted = query(
      collection(cloudDb, 'friendRequests'),
      where('fromUid', '==', user.uid),
      where('status', '==', 'accepted')
    );

    const unsubscribeAccepted = onSnapshot(qAccepted, async (snapshot) => {
      for (const docSnap of snapshot.docs) {
        const req = { id: docSnap.id, ...docSnap.data() } as any;
        
        // Add to local friends
        const localStats = await localDb.userStats.get(1);
        if (localStats) {
          const myFriends = localStats.friends || [];
          if (!myFriends.includes(req.toUid)) {
            await localDb.userStats.update(1, {
              friends: [...myFriends, req.toUid]
            });
            
            // Also update cloud if possible
            try {
              await setDoc(doc(cloudDb, 'userStats', user.uid), {
                friends: arrayUnion(req.toUid)
              }, { merge: true });
            } catch (e) {
              console.error("Failed to update cloud stats:", e);
            }
          }
        }
        
        // Delete the request
        try {
          await deleteDoc(doc(cloudDb, 'friendRequests', req.id));
        } catch (e) {
          console.error("Failed to delete accepted request:", e);
        }
      }
    });

    // Listen for rejected outgoing friend requests
    const qRejected = query(
      collection(cloudDb, 'friendRequests'),
      where('fromUid', '==', user.uid),
      where('status', '==', 'rejected')
    );

    const unsubscribeRejected = onSnapshot(qRejected, async (snapshot) => {
      for (const docSnap of snapshot.docs) {
        try {
          await deleteDoc(doc(cloudDb, 'friendRequests', docSnap.id));
        } catch (e) {
          console.error("Failed to delete rejected request:", e);
        }
      }
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
      unsubscribeAccepted();
      unsubscribeRejected();
    };
  }, [user]);

  const friendUids = userStats?.friends || [];
  const friendUidsString = JSON.stringify(friendUids);

  useEffect(() => {
    if (!user) return;

    // Fetch friends' public profiles
    const fetchFriends = async () => {
      try {
        if (friendUids.length > 0) {
          const friendsData = [];
          for (const fUid of friendUids) {
            const pDoc = await getDoc(doc(cloudDb, 'publicProfiles', fUid));
            if (pDoc.exists()) {
              friendsData.push({ id: pDoc.id, ...pDoc.data() });
            }
          }
          setFriends(friendsData);
        } else {
          setFriends([]);
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    fetchFriends();
  }, [user, friendUidsString]); // Only depend on the stringified array to prevent infinite loops

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setIsSearching(true);
    try {
      let q;
      if (searchQuery.trim().includes('@')) {
        q = query(collection(cloudDb, 'publicProfiles'), where('email', '==', searchQuery.trim()));
      } else {
        q = query(collection(cloudDb, 'publicProfiles'), where('uid', '==', searchQuery.trim()));
      }
      
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(doc => doc.id !== user.uid); // Don't show self
      setSearchResults(results);
      if (results.length === 0) {
        toast.error("No user found with that identifier.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search users.");
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetUser: any) => {
    if (!user) return;
    try {
      const requestId = [user.uid, targetUser.uid].sort().join('_');
      
      // Check if request already exists
      const docRef = doc(cloudDb, 'friendRequests', requestId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        toast.error("Friend request already exists.");
        return;
      }

      await setDoc(docRef, {
        fromUid: user.uid,
        toUid: targetUser.uid,
        fromEmail: user.email || `guest_${user.uid.slice(0, 8)}@system.local`,
        toEmail: targetUser.email || `guest_${targetUser.uid.slice(0, 8)}@system.local`,
        fromName: userStats?.name || user.email?.split('@')[0] || 'Unknown',
        toName: targetUser.name || targetUser.email?.split('@')[0] || 'Unknown',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success("Friend request sent!");
      setSearchResults([]);
      setSearchQuery('');
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast.error("Failed to send friend request: " + error.message);
    }
  };

  const handleRequest = async (request: any, accept: boolean) => {
    if (!user) return;
    try {
      if (accept) {
        const batch = writeBatch(cloudDb);
        
        // Update request status
        batch.update(doc(cloudDb, 'friendRequests', request.id), {
          status: 'accepted'
        });

        // Add to each other's friends list
        const myStatsRef = doc(cloudDb, 'userStats', user.uid);
        const theirStatsRef = doc(cloudDb, 'userStats', request.fromUid);

        const myStatsSnap = await getDoc(myStatsRef);
        if (!myStatsSnap.exists()) {
          toast.error("Please sync your data in Settings first.");
          return;
        }

        batch.update(myStatsRef, { friends: arrayUnion(request.fromUid) });
        batch.update(theirStatsRef, { friends: arrayUnion(user.uid) });

        await batch.commit();

        // Also update local db
        const myFriends = myStatsSnap.data().friends || [];
        if (!myFriends.includes(request.fromUid)) {
          myFriends.push(request.fromUid);
          await localDb.userStats.update(1, { friends: myFriends } as any);
        }

        toast.success("Friend request accepted!");
      } else {
        await updateDoc(doc(cloudDb, 'friendRequests', request.id), {
          status: 'rejected'
        });
        toast.success("Friend request rejected.");
      }
    } catch (error) {
      console.error("Error handling request:", error);
      toast.error("Failed to process request.");
    }
  };

  const viewFriendStats = async (friend: any) => {
    try {
      const statsDoc = await getDoc(doc(cloudDb, 'userStats', friend.id));
      if (statsDoc.exists()) {
        setSelectedFriend({ ...friend, ...statsDoc.data() });
      } else {
        toast.error("Could not load friend's stats.");
      }
    } catch (error) {
      console.error("Error loading friend stats:", error);
      toast.error("Failed to load stats.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center">
          <Users className="w-8 h-8 mr-3" style={{ color: themeColor }} />
          NETWORK
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase tracking-widest">Allies & Connections</p>
      </header>

      {/* My UID */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="text-sm font-mono text-white mb-2">YOUR SYSTEM IDENTIFIER</h3>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-xs select-all">
            {user?.uid}
          </code>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(user?.uid || '');
              toast.success("UID copied to clipboard!");
            }}
            className="text-xs font-mono bg-[#262626] hover:bg-[#333] text-white px-3 py-2 rounded-md transition-colors"
          >
            COPY
          </button>
        </div>
        <p className="text-[10px] font-mono text-[#A3A3A3] mt-2 uppercase tracking-tighter">
          Share this UID with others to let them add you as an ally.
        </p>
      </div>

      {/* Search Users */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="text-sm font-mono text-white mb-4">FIND ALLIES</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter user email or UID..."
            className="flex-1 bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#333]"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-[#262626] hover:bg-[#333] text-white px-4 py-2 rounded-md font-mono text-sm transition-colors flex items-center"
          >
            <Search className="w-4 h-4 mr-2" />
            SEARCH
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map(result => (
              <div key={result.id} className="flex items-center justify-between bg-[#0A0A0A] p-3 rounded-md border border-[#262626]">
                <div className="flex items-center gap-3">
                  {result.avatar ? (
                    <img src={result.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-[#333]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-[#A3A3A3]" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-mono text-white">{result.name}</div>
                    <div className="text-[10px] font-mono text-[#A3A3A3]">Level {result.level} • {result.rank}</div>
                  </div>
                </div>
                <button
                  onClick={() => sendFriendRequest(result)}
                  className="text-xs font-mono bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded transition-colors"
                >
                  ADD FRIEND
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Friend Requests */}
      {incomingRequests.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h3 className="text-sm font-mono text-white mb-4 flex items-center">
            <Shield className="w-4 h-4 mr-2 text-yellow-500" />
            INCOMING REQUESTS
          </h3>
          <div className="space-y-2">
            {incomingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-[#0A0A0A] p-3 rounded-md border border-[#262626]">
                <div>
                  <div className="text-sm font-mono text-white">{req.fromName}</div>
                  <div className="text-[10px] font-mono text-[#A3A3A3]">{req.fromEmail}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequest(req, true)}
                    className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRequest(req, false)}
                    className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Friend Requests */}
      {outgoingRequests.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h3 className="text-sm font-mono text-white mb-4 flex items-center">
            <Shield className="w-4 h-4 mr-2 text-blue-500" />
            OUTGOING REQUESTS
          </h3>
          <div className="space-y-2">
            {outgoingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-[#0A0A0A] p-3 rounded-md border border-[#262626]">
                <div>
                  <div className="text-sm font-mono text-white">{req.toName || req.toEmail}</div>
                  <div className="text-[10px] font-mono text-[#A3A3A3]">Pending...</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await updateDoc(doc(cloudDb, 'friendRequests', req.id), { status: 'rejected' });
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="text-sm font-mono text-white mb-4">ALLIES</h3>
        {friends.length === 0 ? (
          <div className="text-center py-8 text-[#A3A3A3] font-mono text-sm">
            No allies found. Search for users to add them to your network.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map(friend => (
              <button
                key={friend.id}
                onClick={() => viewFriendStats(friend)}
                className="flex items-center gap-4 bg-[#0A0A0A] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-colors text-left relative"
              >
                <div className="relative">
                  {friend.avatar ? (
                    <img src={friend.avatar} alt="avatar" className="w-12 h-12 rounded-full border border-[#333]" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#A3A3A3]" />
                    </div>
                  )}
                  {isOnline(friend.lastActive) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0A0A0A] rounded-full"></div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-mono text-white flex items-center gap-2">
                    {friend.name}
                  </div>
                  <div className="text-xs font-mono text-[#A3A3A3] mt-1">Level {friend.level} • {friend.rank}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Friend Stats Modal */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedFriend(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-[#262626] rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  {selectedFriend.avatar ? (
                    <img src={selectedFriend.avatar} alt="avatar" className="w-16 h-16 rounded-full border border-[#333]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#262626] flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-[#A3A3A3]" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-mono text-white">{selectedFriend.name || 'Unknown Player'}</h3>
                    <div className="text-sm font-mono text-[#A3A3A3]">
                      Level {Math.floor((selectedFriend.xp || 0) / 1000) + 1}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedFriend(null)} className="text-[#A3A3A3] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[10px] font-mono text-[#A3A3A3] mb-1">STRENGTH</div>
                  <div className="text-lg font-mono text-white">{selectedFriend.STR || 0}</div>
                </div>
                <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[10px] font-mono text-[#A3A3A3] mb-1">VITALITY</div>
                  <div className="text-lg font-mono text-white">{selectedFriend.VIT || 0}</div>
                </div>
                <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[10px] font-mono text-[#A3A3A3] mb-1">AGILITY</div>
                  <div className="text-lg font-mono text-white">{selectedFriend.AGI || 0}</div>
                </div>
                <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[10px] font-mono text-[#A3A3A3] mb-1">INTELLIGENCE</div>
                  <div className="text-lg font-mono text-white">{selectedFriend.INT || 0}</div>
                </div>
                <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626] col-span-2">
                  <div className="text-[10px] font-mono text-[#A3A3A3] mb-1">SENSE</div>
                  <div className="text-lg font-mono text-white">{selectedFriend.SEN || 0}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
