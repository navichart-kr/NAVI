'use client'

import { AnimatePresence } from 'framer-motion'
import { DarkOverlay }      from './DarkOverlay'
import { TutorialStep }     from './TutorialStep'
import { TutorialComplete } from './TutorialComplete'
import { useTutorialStore } from '@/stores/tutorialStore'

export function TutorialManager() {
  const { isActive } = useTutorialStore()

  return (
    <>
      {/* 진행 중 오버레이 */}
      <AnimatePresence>
        {isActive && (
          <>
            <DarkOverlay />
            <TutorialStep />
          </>
        )}
      </AnimatePresence>

      {/* 완료 화면 (isActive 독립적으로 렌더) */}
      <TutorialComplete />
    </>
  )
}
