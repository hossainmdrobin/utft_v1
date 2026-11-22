import { Skeleton } from '@/components/ui/skeleton';
import { useGetConversationsQuery } from '@/store/slices/chatSlice/api.chat'
import Link from 'next/link';
import React from 'react'

export default function ChatHistory() {
    const { data, isLoading } = useGetConversationsQuery()

    return (
        <div className='h-[calc(100vh-118.5x)] overflow-y-auto'>
            <hr />
            <h2 className='py-2'>Chat History</h2>
            {
                isLoading && [1, 2, 3, 4, 5, 6].map(item => <Skeleton key={item} className='h-10 my-1' />)
            }

            {
                data?.data?.map((item, i) => (
                    <div className='text-gray-500 p-1 hover:bg-gray-500/3 cursor-pointer'>
                        <h1>
                            <Link href={`/app/chat/${item._id}`}>{item.title || item._id} </Link>
                        </h1>
                    </div>
                ))
            }
        </div>
    )
}
