import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db as cloudDb } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, onSnapshot, setDoc, arrayUnion } from 'firebase/firestore';
import { Users, Search, UserPlus, Check, X, Shield, Activity, Swords } from 'lucide-react';
import { getRank } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { db as localDb } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

export function FriendsView() {
  const { user } = useAuth();
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  
  const userStats = useLiveQuery(() => localDb.userStats.get(1));
  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  useEffect(() => {
    if (!user) return;

    // Listen for friend requests
    const q = query(
      collection(cloudDb, 'friendRequests'),
      where('toUid', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriendRequests(reqs);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch friends' public profiles
    const fetchFriends = async () => {
      try {
        const statsDoc = await getDoc(doc(cloudDb, 'userStats', user.uid));
        if (statsDoc.exists()) {
          const data = statsDoc.data();
          const friendUids = data.friends || [];
          
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
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    fetchFriends();
  }, [user, friendRequests]); // Re-fetch when requests change (accepted)

  const handleSearch = async () => {
    if (!searchEmail.trim() || !user) return;
    setIsSearching(true);
    try {
      const q = query(collection(cloudDb, 'publicProfiles'), where('email', '==', searchEmail.trim()));
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(doc => doc.id !== user.uid); // Don't show self
      setSearchResults(results);
      if (results.length === 0) {
        toast.error("No user found with that email.");
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
        fromEmail: user.email,
        toEmail: targetUser.email,
        fromName: userStats?.name || user.email?.split('@')[0] || 'Unknown',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success("Friend request sent!");
      setSearchResults([]);
      setSearchEmail('');
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send friend request.");
    }
  };

  const handleRequest = async (request: any, accept: boolean) => {
    if (!user) return;
    try {
      // Update request status
      await updateDoc(doc(cloudDb, 'friendRequests', request.id), {
        status: accept ? 'accepted' : 'rejected'
      });

      if (accept) {
        // Add to each other's friends list
        const myStatsRef = doc(cloudDb, 'userStats', user.uid);
        const theirStatsRef = doc(cloudDb, 'userStats', request.fromUid);

        await updateDoc(myStatsRef, { friends: arrayUnion(request.fromUid) });
        await updateDoc(theirStatsRef, { friends: arrayUnion(user.uid) });

        // Also update local db
        const myStatsSnap = await getDoc(myStatsRef);
        if (myStatsSnap.exists()) {
          const myFriends = myStatsSnap.data().friends || [];
          await localDb.userStats.update(1, { friends: myFriends } as any);
        }

        toast.success("Friend request accepted!");
      } else {
        toast.success("Friend request rejected.");
      }
    } catch (error) {
      console.error("Error handling request:", error);
      toast.error("Failed to process request.");
    }
  };

  const viewFriendStats = async (friendId: string) => {
    try {
      const statsDoc = await getDoc(doc(cloudDb, 'userStats', friendId));
      if (statsDoc.exists()) {
        setSelectedFriend(statsDoc.data());
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

      {/* Search Users */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="text-sm font-mono text-white mb-4">FIND ALLIES</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Enter user email..."
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

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h3 className="text-sm font-mono text-white mb-4 flex items-center">
            <Shield className="w-4 h-4 mr-2 text-yellow-500" />
            PENDING REQUESTS
          </h3>
          <div className="space-y-2">
            {friendRequests.map(req => (
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
                onClick={() => viewFriendStats(friend.id)}
                className="flex items-center gap-4 bg-[#0A0A0A] p-4 rounded-xl border border-[#262626] hover:border-[#333] transition-colors text-left"
              >
                {friend.avatar ? (
                  <img src={friend.avatar} alt="avatar" className="w-12 h-12 rounded-full border border-[#333]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#A3A3A3]" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-mono text-white">{friend.name}</div>
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
