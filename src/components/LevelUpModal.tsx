import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRank } from '../lib/utils';
import { Trophy, ArrowUpCircle } from 'lucide-react';

interface LevelUpModalProps {
  level: number;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const { rank, color } = getRank(level);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="bg-[#0A0A0A] border-2 rounded-2xl p-8 max-w-sm w-full text-center relative overflow-hidden"
          style={{ borderColor: color, boxShadow: `0 0 40px ${color}40` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Glow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20 blur-3xl rounded-full pointer-events-none"
            style={{ backgroundColor: color }}
          />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${color}20`, border: `2px solid ${color}` }}
          >
            <ArrowUpCircle className="w-12 h-12" style={{ color }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-2">LEVEL UP!</h2>
            <div className="text-5xl font-black font-mono mb-4" style={{ color, textShadow: `0 0 20px ${color}80` }}>
              {level}
            </div>
            <div className="text-sm font-mono text-[#A3A3A3] mb-1">CURRENT RANK</div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-widest mb-8 px-2" style={{ color }}>
              {rank}
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onClose}
            className="w-full py-3 rounded-lg font-mono font-bold text-white transition-all hover:bg-white/10"
            style={{ backgroundColor: `${color}40`, border: `1px solid ${color}` }}
          >
            ACKNOWLEDGE
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
