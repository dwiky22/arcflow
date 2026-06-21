import IncomingNotifier from '@/components/ui/IncomingNotifier'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IncomingNotifier />
      {children}
    </>
  )
}