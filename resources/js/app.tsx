import React from 'react';
import { motion } from 'motion/react';

/**
 * Root React App component.
 * This is the entry point for all React-powered views.
 * The page/route is determined by a data attribute on #react-root.
 */
export default function App() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* React pages will be routed here */}
        </motion.div>
    );
}
