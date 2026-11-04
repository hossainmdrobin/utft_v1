import React from 'react'
import { Bot, Receipt, Calculator, Users, CalendarClock, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StartChatProps {
  onExamplePrompt?: (prompt: string) => void
}

export default function StartChat({ onExamplePrompt }: StartChatProps) {
  const capabilities = [
    {
      icon: Receipt,
      title: 'Transactions & Payments',
      description: 'Find transactions, check payment statuses, and review payment history.',
      example: 'Show me all pending payments from last month',
    },
    {
      icon: Calculator,
      title: 'Calculations & Reports',
      description: 'Calculate totals, summarize financial data, and understand reports.',
      example: 'Calculate total revenue for this quarter',
    },
    {
      icon: Users,
      title: 'Members',
      description: 'Find member information and understand membership records.',
      example: 'Find member details for John Doe',
    },
    {
      icon: CalendarClock,
      title: 'Installments',
      description: 'Check installment history, outstanding dues, and payment progress.',
      example: 'Show me all overdue installments',
    },
    {
      icon: Wallet,
      title: 'Accounting',
      description: 'Understand income, expenses, account balances, and financial records.',
      example: 'What are our total expenses this year?',
    },
  ]

  const handleClick = (prompt: string) => {
    if (onExamplePrompt) {
      onExamplePrompt(prompt)
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center px-4 overflow-y-auto">
      <div className="max-w-4xl w-full space-y-8 py-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Bot className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">How can I help you today?</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            I'm your AI assistant for the UTFT application. I can help you understand and manage information within UTFT by analyzing transactions, members, payments, and financial data.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 text-center">You can ask me about:</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <Card 
                key={capability.title} 
                className="border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleClick(capability.example)}
              >
                <CardContent className="p-4 flex items-start gap-3 h-full">
                  <div className="rounded-lg bg-blue-50 p-2 flex-shrink-0">
                    <capability.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">{capability.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{capability.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          Click on any card to use an example prompt, or just start typing your question below.
        </div>
      </div>
    </div>
  )
}
