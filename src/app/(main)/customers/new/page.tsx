"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ✅ Zod Validation Schema
const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(1, "Address is required"),
  aadhaar: z.string().optional(),
  pan: z.string().optional(),
  voterId: z.string().optional(),
  photo: z
    .any()
    .refine((file) => file && file.length > 0 && file[0]?.size > 0, "Photo is required"),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomerRegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  // ✅ Photo Upload Function using FreeImage.host
  const uploadPhotoToFreeImageHost = async (photo: File): Promise<string> => {
    const formData = new FormData();
    formData.append("key", "6d207e02198a847aa98d0a2a901485a5"); // 🔁 Replace with your FreeImage.host API key
    formData.append("action", "upload");
    formData.append("source", photo);
    formData.append("format", "json");

    const response = await fetch("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.status_code !== 200) {
      throw new Error("Photo upload failed");
    }

    return data.image.url;
  };

  // ✅ Submit Handler
  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      const photoURL = await uploadPhotoToFreeImageHost(data.photo[0]);

      await addDoc(collection(db, "customers"), {
        name: data.name,
        phone: data.phone,
        address: data.address,
        aadhaar: data.aadhaar || null,
        pan: data.pan || null,
        voterId: data.voterId || null,
        photo_url: photoURL,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Customer Registered",
        description: "The customer has been added successfully.",
      });

      router.push("/customers");
    } catch (error: any) {
      console.error("Form Submission Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message === "Photo upload failed"
            ? "Photo upload failed. Please try again."
            : "Network error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Register New Customer</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Full Name
          </label>
          <Input id="name" type="text" {...form.register("name")} placeholder="Enter full name" />
          <p className="text-red-500 text-sm">{form.formState.errors.name?.message}</p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Phone Number
          </label>
          <Input id="phone" type="text" {...form.register("phone")} placeholder="Enter phone" />
          <p className="text-red-500 text-sm">{form.formState.errors.phone?.message}</p>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium">
            Address
          </label>
          <Textarea id="address" {...form.register("address")} placeholder="Enter address" />
          <p className="text-red-500 text-sm">{form.formState.errors.address?.message}</p>
        </div>

        <div>
          <label htmlFor="aadhaar" className="block text-sm font-medium">
            Aadhaar (Optional)
          </label>
          <Input id="aadhaar" type="text" {...form.register("aadhaar")} />
        </div>

        <div>
          <label htmlFor="pan" className="block text-sm font-medium">
            PAN (Optional)
          </label>
          <Input id="pan" type="text" {...form.register("pan")} />
        </div>

        <div>
          <label htmlFor="voterId" className="block text-sm font-medium">
            Voter ID (Optional)
          </label>
          <Input id="voterId" type="text" {...form.register("voterId")} />
        </div>

        <div>
          <label htmlFor="photo" className="block text-sm font-medium">
            Photo
          </label>
          <Input id="photo" type="file" accept="image/*" {...form.register("photo")} />
          <p className="text-red-500 text-sm">{form.formState.errors.photo?.message}</p>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Register Customer"}
        </Button>
      </form>
    </div>
  );
}



// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { addDoc, collection } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { useToast } from "@/hooks/use-toast";

// // ✅ Zod Validation Schema
// const customerSchema = z.object({
//   name: z.string().min(1, "Name is required"),
//   phone: z.string().min(10, "Phone number must be at least 10 digits"),
//   address: z.string().min(1, "Address is required"),
//   aadhaar: z.string().optional(),
//   pan: z.string().optional(),
//   voterId: z.string().optional(),
//   photo: z
//     .any()
//     .refine((file) => file && file.length > 0 && file[0]?.size > 0, "Photo is required"),
// });

// type CustomerFormValues = z.infer<typeof customerSchema>;

// export default function CustomerRegistrationForm() {
//   const router = useRouter();
//   const { toast } = useToast();
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const form = useForm<CustomerFormValues>({
//     resolver: zodResolver(customerSchema),
//   });

//   // ✅ Photo Upload Function (imgbb) — COMMENTED OUT
//   // const uploadPhotoToImgBB = async (photo: File) => {
//   //   const formData = new FormData();
//   //   formData.append("image", photo);

//   //   const imgbbApiKey = "c9f4edabbd1fe1bc3a063e26bc6a2ecd"; // ✅ Your working API key
//   //   const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
//   //     method: "POST",
//   //     body: formData,
//   //   });

//   //   const data = await response.json();
//   //   if (!response.ok || !data.success) {
//   //     throw new Error("Photo upload failed");
//   //   }
//   //   return data.data.url;
//   // };

//   // ✅ Submit Handler
//   const onSubmit = async (data: CustomerFormValues) => {
//     setIsSubmitting(true);
//     try {
//       // ✅ Skipping photo upload temporarily
//       // const photoURL = await uploadPhotoToImgBB(data.photo[0]);
//       const photoURL = null; // or use a placeholder image URL if needed

//       await addDoc(collection(db, "customers"), {
//         name: data.name,
//         phone: data.phone,
//         address: data.address,
//         aadhaar: data.aadhaar || null,
//         pan: data.pan || null,
//         voterId: data.voterId || null,
//         photo_url: photoURL,
//         createdAt: new Date().toISOString(),
//       });

//       toast({
//         title: "Customer Registered",
//         description: "The customer has been added successfully.",
//       });

//       router.push("/customers");
//     } catch (error: any) {
//       console.error("Form Submission Error:", error);
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description:
//           error.message === "Photo upload failed"
//             ? "Photo upload failed. Please try again."
//             : "Network error occurred. Please try again.",
//       });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="max-w-lg mx-auto">
//       <h1 className="text-2xl font-bold mb-6">Register New Customer</h1>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//         <div>
//           <label htmlFor="name" className="block text-sm font-medium">
//             Full Name
//           </label>
//           <Input id="name" type="text" {...form.register("name")} placeholder="Enter full name" />
//           <p className="text-red-500 text-sm">{form.formState.errors.name?.message}</p>
//         </div>

//         <div>
//           <label htmlFor="phone" className="block text-sm font-medium">
//             Phone Number
//           </label>
//           <Input id="phone" type="text" {...form.register("phone")} placeholder="Enter phone" />
//           <p className="text-red-500 text-sm">{form.formState.errors.phone?.message}</p>
//         </div>

//         <div>
//           <label htmlFor="address" className="block text-sm font-medium">
//             Address
//           </label>
//           <Textarea id="address" {...form.register("address")} placeholder="Enter address" />
//           <p className="text-red-500 text-sm">{form.formState.errors.address?.message}</p>
//         </div>

//         <div>
//           <label htmlFor="aadhaar" className="block text-sm font-medium">
//             Aadhaar (Optional)
//           </label>
//           <Input id="aadhaar" type="text" {...form.register("aadhaar")} />
//         </div>

//         <div>
//           <label htmlFor="pan" className="block text-sm font-medium">
//             PAN (Optional)
//           </label>
//           <Input id="pan" type="text" {...form.register("pan")} />
//         </div>

//         <div>
//           <label htmlFor="voterId" className="block text-sm font-medium">
//             Voter ID (Optional)
//           </label>
//           <Input id="voterId" type="text" {...form.register("voterId")} />
//         </div>

//         <div>
//           <label htmlFor="photo" className="block text-sm font-medium">
//             Photo
//           </label>
//           <Input id="photo" type="file" accept="image/*" {...form.register("photo")} />
//           <p className="text-red-500 text-sm">{form.formState.errors.photo?.message}</p>
//         </div>

//         <Button type="submit" className="w-full" disabled={isSubmitting}>
//           {isSubmitting ? "Submitting..." : "Register Customer"}
//         </Button>
//       </form>
//     </div>
//   );
// }
