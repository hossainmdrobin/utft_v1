import { Button } from '@/components/ui/button'
import { InstallmentDoc } from '@/models/Installment'
import { useActionOnInstallmentMutation } from '@/store/slices/installmentSlice/api.installment'
import { Check } from 'lucide-react'
import React from 'react'


export default function SingleInstallmentCard({ _id, created_at, amount, year, month, status }: InstallmentDoc) {
  const [action, { isLoading }] = useActionOnInstallmentMutation()
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
        {status == "due" && !isLoading && <Button
          onClick={() => action({ id: _id, status: "paid" })}
        >Mark as Paid</Button>}
        {isLoading && <span>Loading</span>}
      </div>
    </div>
  )
}
