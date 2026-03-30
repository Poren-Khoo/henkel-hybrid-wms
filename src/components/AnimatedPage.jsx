import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 6 },
  enter:   { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
}

export default function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
