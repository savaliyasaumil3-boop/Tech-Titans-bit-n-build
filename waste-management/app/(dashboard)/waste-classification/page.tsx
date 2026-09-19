"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Recycle,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Camera,
  Layers,
  Leaf,
  Info,
  ArrowRight,
} from "lucide-react";

interface SampleItem {
  id: string;
  name: string;
  category: "Plastic" | "Organic" | "Metal" | "Paper" | "E-Waste" | "Glass";
  confidence: number;
  recyclability: string;
  recommendedBin: string;
  carbonOffset: string;
  decompositionTime: string;
  tips: string;
  emoji: string;
}

const sampleItems: SampleItem[] = [
  {
    id: "s-1",
    name: "PET Mineral Water Bottle",
    category: "Plastic",
    confidence: 98.4,
    recyclability: "100% Recyclable (Type 1 PET)",
    recommendedBin: "Blue Smart Bin (Plastic & Dry)",
    carbonOffset: "0.12 kg CO₂ saved per bottle",
    decompositionTime: "450 Years in landfill",
    tips: "Empty liquid, compress bottle to save 70% space, leave cap attached.",
    emoji: "🧴",
  },
  {
    id: "s-2",
    name: "Discarded Smartphone Motherboard",
    category: "E-Waste",
    confidence: 96.8,
    recyclability: "Hazardous / High-Value Precious Metal Recovery",
    recommendedBin: "Red Smart Bin (E-Waste & Toxics)",
    carbonOffset: "1.45 kg CO₂ saved via gold/copper reclamation",
    decompositionTime: "1,000+ Years (Toxic Leaching risk)",
    tips: "Do not throw in general municipal bins. Contains lithium and heavy metals.",
    emoji: "📱",
  },
  {
    id: "s-3",
    name: "Banana Peels & Kitchen Scraps",
    category: "Organic",
    confidence: 99.1,
    recyclability: "100% Biodegradable / Aerobic Compostable",
    recommendedBin: "Green Smart Bin (Wet & Organic)",
    carbonOffset: "0.45 kg methane prevented from landfill",
    decompositionTime: "2 to 4 Weeks in composting unit",
    tips: "Ideal for community biomethanation plants or home vermicompost.",
    emoji: "🍌",
  },
  {
    id: "s-4",
    name: "Crushed Beverage Aluminum Can",
    category: "Metal",
    confidence: 97.9,
    recyclability: "Infinitely Recyclable without quality loss",
    recommendedBin: "Yellow Smart Bin (Metals & Cans)",
    carbonOffset: "0.95 kg CO₂ (saves 95% energy vs virgin bauxite)",
    decompositionTime: "200 to 500 Years",
    tips: "Rinse remaining sugars to prevent insect contamination at sorting stations.",
    emoji: "🥫",
  },
  {
    id: "s-5",
    name: "Corrugated Cardboard Packaging Box",
    category: "Paper",
    confidence: 95.2,
    recyclability: "Recyclable up to 7 cycles",
    recommendedBin: "Blue Smart Bin (Paper / Dry Fiber)",
    carbonOffset: "0.82 kg CO₂ per kg of recycled pulp",
    decompositionTime: "2 Months if dry",
    tips: "Flatten box, remove plastic packing tape and Styrofoam inserts.",
    emoji: "📦",
  },
];

export default function WasteClassificationPage() {
  const [selectedItem, setSelectedItem] = useState<SampleItem>(sampleItems[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [customUploaded, setCustomUploaded] = useState(false);

  const triggerScan = (item: SampleItem) => {
    setIsScanning(true);
    setCustomUploaded(false);
    setTimeout(() => {
      setSelectedItem(item);
      setIsScanning(false);
    }, 600);
  };

  const handleSimulatedUpload = () => {
    setIsScanning(true);
    setTimeout(() => {
      setCustomUploaded(true);
      setSelectedItem({
        id: "custom",
        name: "Detected Polypropylene (PP) Food Container",
        category: "Plastic",
        confidence: 94.7,
        recyclability: "Type 5 PP Recyclable",
        recommendedBin: "Blue Smart Bin (Plastics)",
        carbonOffset: "0.28 kg CO₂ saved",
        decompositionTime: "20-30 Years",
        tips: "Wipe grease residue before depositing to prevent batch contamination.",
        emoji: "🥡",
      });
      setIsScanning(false);
    }, 800);
  };

  return (
    <>
      <Header
        title="AI Waste Classification & Vision"
        subtitle="Computer vision neural models for instant edge waste sorting and recyclability assessment"
      />

      <div className="space-y-6 p-6">
        {/* Top Feature Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Vision Model Accuracy</p>
                <p className="text-xl font-bold tracking-tight">97.4%</p>
                <p className="text-[11px] text-muted-foreground">MobileNetV4 + YOLOv11 Backbones</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Segregation Compliance</p>
                <p className="text-xl font-bold tracking-tight text-green-600">92.8%</p>
                <p className="text-[11px] text-muted-foreground">Across 25 Ahmedabad smart hubs</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Classification Latency</p>
                <p className="text-xl font-bold tracking-tight text-blue-600">42 ms</p>
                <p className="text-[11px] text-muted-foreground">Real-time edge camera inference</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Classifier Playground */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input selection & Test Samples */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  Live Camera / Sample Feed
                </CardTitle>
                <CardDescription className="text-xs">
                  Select a test specimen or upload an image to run real-time inference
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload simulation button */}
                <div
                  onClick={handleSimulatedUpload}
                  className="border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-xl p-6 text-center cursor-pointer bg-muted/20"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to simulate test camera capture</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports JPG, PNG, WEBP from smart bin optical sensors
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Or select pre-scanned telemetry items:
                  </p>
                  <div className="space-y-2">
                    {sampleItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => triggerScan(item)}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          selectedItem.id === item.id && !customUploaded
                            ? "border-primary bg-primary/5 font-semibold text-primary"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{item.emoji}</span>
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground">Category: {item.category}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {item.confidence}% Conf.
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Inference Analysis Output */}
          <div className="lg:col-span-7">
            <Card className="shadow-none h-full">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedItem.emoji}</span>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedItem.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Classified via SwachhSetu Edge Neural Network
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-1">
                    {selectedItem.category} Waste
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {isScanning ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-medium">Running Deep Neural Inference…</p>
                    <p className="text-xs text-muted-foreground">Extracting spectral and geometric features</p>
                  </div>
                ) : (
                  <>
                    {/* Confidence Meter */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Model Confidence Score
                        </span>
                        <span className="tabular-nums text-primary text-sm font-bold">
                          {selectedItem.confidence}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${selectedItem.confidence}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Recyclability Rating</p>
                        <p className="text-sm font-semibold text-foreground">{selectedItem.recyclability}</p>
                      </div>

                      <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Assigned Smart Bin Target</p>
                        <p className="text-sm font-semibold text-primary">{selectedItem.recommendedBin}</p>
                      </div>

                      <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Environmental Carbon Offset</p>
                        <p className="text-sm font-semibold text-green-600">{selectedItem.carbonOffset}</p>
                      </div>

                      <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Landfill Persistence</p>
                        <p className="text-sm font-semibold text-amber-600">{selectedItem.decompositionTime}</p>
                      </div>
                    </div>

                    {/* Handling instructions */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wide">
                        <Info className="h-4 w-4" />
                        Automated Segregation Instructions
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {selectedItem.tips}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        Export Detection JSON
                      </Button>
                      <Button size="sm" className="text-xs gap-1">
                        Register to City Log
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
