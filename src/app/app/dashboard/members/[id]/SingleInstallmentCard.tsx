import { Button } from '@/components/ui/button'
import { InstallmentDoc } from '@/models/Installment'
import { Check } from 'lucide-react'
import React from 'react'


export default function SingleInstallmentCard({ created_at, amount, year, month, status }: InstallmentDoc) {
  return (
    <div className="p-2 border rounded my-1 flex items-center justify-between">
      <div>
        <p>{created_at}</p>
        <span className="bg-blue-800 text-sm rounded px-1">{status}</span>
      </div>
      <div>{amount}</div>
      <div>{status}</div>
      <div>{`${month}-${year}`}</div>
      <div>
        {status != "due" && <div className='flex items-center text-green-400'><Check size={18} /> <span>Paid</span></div>}
        {status == "due" && <Button>Mark as Paid</Button>}
      </div>
    </div>
  )
}
