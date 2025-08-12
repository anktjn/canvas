"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="font-sans min-h-screen w-full flex justify-center p-6 sm:p-10">
      <main className="w-full max-w-5xl space-y-8">
        <SiteHeader />

        <Card>
          <CardHeader>
            <CardTitle>Component Showcase</CardTitle>
            <CardDescription>Quick demo of installed shadcn/ui components.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button onClick={() => toast.success("Action completed")}>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Badge>New</Badge>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="about">About</Label>
                <Textarea id="about" placeholder="Tell us something cool" />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="optin" checked={emailOptIn} onCheckedChange={(v) => setEmailOptIn(Boolean(v))} />
                <Label htmlFor="optin">Email me updates</Label>
              </div>
              <div className="flex items-center gap-3">
                <Label className="mr-2">Notifications</Label>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <div className="grid gap-2">
                <Label>Progress</Label>
                <Progress value={66} />
              </div>
            </div>

            <div className="space-y-4">
              <Tabs defaultValue="account" className="w-full">
                <TabsList>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>
                <TabsContent value="account" className="space-y-2">
                  <p className="text-sm text-muted-foreground">Manage profile settings.</p>
                </TabsContent>
                <TabsContent value="security" className="space-y-2">
                  <p className="text-sm text-muted-foreground">Update password and MFA.</p>
                </TabsContent>
              </Tabs>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is shadcn/ui?</AccordionTrigger>
                  <AccordionContent>Beautiful, copy-paste components built with Radix UI and Tailwind.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Can I customize it?</AccordionTrigger>
                  <AccordionContent>Yes. Components live in your repo, so you can edit freely.</AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex items-center gap-3 flex-wrap">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <CardTitle>Heads up</CardTitle>
                    <CardDescription>This is a dialog from shadcn/ui.</CardDescription>
                    <Button onClick={() => toast("Nice!")}>Toast</Button>
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Menu</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toast("Profile clicked")}>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>Tooltip content</TooltipContent>
                </Tooltip>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Open Sheet</Button>
                  </SheetTrigger>
                  <SheetContent side="right">Sheet content goes here.</SheetContent>
                </Sheet>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => toast.success("Saved")}>Save changes</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
