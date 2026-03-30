import React from 'react'
import PageContainer from '../../../components/PageContainer'
import OutboundPlanningOrdersTab from './OutboundPlanningOrdersTab'

export default function OutboundPlanning() {
    return (
        <PageContainer>
            <div className="space-y-4">
                <OutboundPlanningOrdersTab />
            </div>
        </PageContainer>
    )
}
