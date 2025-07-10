'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  getDocs,
  query,
  where,
  DocumentData,
} from 'firebase/firestore'

type Partner = {
  id: string
  name: string
  contribution: number
}

type CapitalStats = Partner & {
  topupTotal: number
  deductionTotal: number
  totalCapital: number
  currentBalance: number
}

export default function PartnerCapitalPage() {
  const [data, setData] = useState<CapitalStats[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch all partners
  const fetchPartners = async (): Promise<Partner[]> => {
    const snapshot = await getDocs(collection(db, 'partners'))
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Partner[]
  }

  // Fetch topups of a partner
  const fetchTopups = async (partnerId: string) => {
    const snapshot = await getDocs(collection(db, `partners/${partnerId}/topups`))
    return snapshot.docs.map((doc) => doc.data())
  }

  // Fetch deductions of a partner
  const fetchDeductions = async (partnerId: string) => {
    const q = query(collection(db, 'capital-deductions'), where('partnerId', '==', partnerId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => doc.data())
  }

  // Calculate capital stats
  const calculateStats = async (partner: Partner): Promise<CapitalStats> => {
    const topups = await fetchTopups(partner.id)
    const deductions = await fetchDeductions(partner.id)

    const topupTotal = topups.reduce((sum, t: DocumentData) => sum + (t.amount || 0), 0)
    const deductionTotal = deductions.reduce((sum, d: DocumentData) => sum + (d.amount || 0), 0)

    const totalCapital = partner.contribution + topupTotal
    const currentBalance = totalCapital - deductionTotal

    return {
      ...partner,
      topupTotal,
      deductionTotal,
      totalCapital,
      currentBalance,
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const partners = await fetchPartners()
      const detailed = await Promise.all(partners.map((p) => calculateStats(p)))
      setData(detailed)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Partner Capital Summary</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {data.map((p) => (
            <div key={p.id} className="border rounded p-4 shadow">
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p>🎯 Initial Contribution: ₹{p.contribution.toLocaleString()}</p>
              <p>➕ Total Top-ups: ₹{p.topupTotal.toLocaleString()}</p>
              <p>➖ Total Deductions: ₹{p.deductionTotal.toLocaleString()}</p>
              <p className="font-bold text-green-600">💰 Available Balance: ₹{p.currentBalance.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}