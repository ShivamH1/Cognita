"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { PageHeader } from "@/components/app-shell"
import { Button, Card, Input, LoadingState } from "@/components/ui"
import { Map, Plus, X, ArrowLeft, Link as LinkIcon } from "lucide-react"

export default function CreateRoadmapPage() {
  const router = useRouter()
  const api = useApi()
  const token = useApiToken()

  const [title, setTitle] = useState("")
  const [topic, setTopic] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [durationWeeks, setDurationWeeks] = useState("")
  const [urls, setUrls] = useState<string[]>([""])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.listDocuments(),
    enabled: !!token,
  })

  const addUrl = () => setUrls([...urls, ""])
  const removeUrl = (i: number) => setUrls(urls.filter((_, idx) => idx !== i))
  const updateUrl = (i: number, val: string) => {
    const next = [...urls]
    next[i] = val
    setUrls(next)
  }

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !topic.trim()) return
    setSubmitting(true)
    setError("")
    try {
      const validUrls = urls.filter((u) => u.trim())
      const res = await api.createRoadmap({
        title: title.trim(),
        topic: topic.trim(),
        targetAudience: targetAudience.trim() || undefined,
        durationWeeks: durationWeeks ? parseInt(durationWeeks) : undefined,
        providedUrls: validUrls.length > 0 ? validUrls : undefined,
        documentIds: selectedDocs.length > 0 ? selectedDocs : undefined,
      })
      router.push(`/roadmaps/${res.roadmapId}`)
    } catch (err: any) {
      setError(err.message || "Failed to create roadmap")
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<Map className="w-5 h-5" />}
        title="Create Learning Roadmap"
        subtitle="Define a topic and let AI generate a structured learning path with free resources."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AI Engineer Learning Path" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Topic *</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Machine Learning, Web Development, Data Science" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Target Audience</label>
              <Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. Beginners, Undergraduate" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Duration (weeks)</label>
              <Input type="number" min={1} max={52} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} placeholder="e.g. 12" />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">Resource URLs (optional)</h2>
          <p className="text-xs text-[var(--text-3)]">Add any specific URLs you want included in the roadmap (MIT lectures, YouTube playlists, etc.)</p>

          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                <Input value={url} onChange={(e) => updateUrl(i, e.target.value)} placeholder="https://..." className="pl-10" />
              </div>
              {urls.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => removeUrl(i)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addUrl}>
            <Plus className="w-4 h-4" /> Add URL
          </Button>
        </Card>

        {docs && docs.length > 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[var(--text)]">Reference Documents (optional)</h2>
            <p className="text-xs text-[var(--text-3)]">Select uploaded documents to use as reference material.</p>

            <div className="space-y-2">
              {docs.filter(d => d.status === "READY").map((doc) => (
                <label key={doc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => toggleDoc(doc.id)}
                    className="rounded border-[var(--border)]"
                  />
                  <span className="text-sm text-[var(--text)]">{doc.filename}</span>
                </label>
              ))}
            </div>
          </Card>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={!title.trim() || !topic.trim() || submitting} className="w-full">
          {submitting ? "Creating..." : "Generate Roadmap"}
        </Button>
      </form>
    </div>
  )
}
