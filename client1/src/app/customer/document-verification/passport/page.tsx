'use client'
import dotenv from 'dotenv';
import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Stepper, StepperComponent } from '@/components/Stepper';
import { CameraCapture } from '@/components/CameraCapture';
import { DocumentUpload } from '@/components/DocumentUpload';
import { CustomerLayout } from '@/components/CustomerLayout';
import { encryptFile } from "@/utils/encrypt";
import { useContext } from 'react';
import { GlobalContext } from '@/context/context';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { StateContext } from '@/context/ContractContext';
import Cookies from "../../../../../node_modules/@types/js-cookie"; // Install this package if not already: npm install js-cookie
import { useRouter } from 'next/navigation';

dotenv.config();

const Page = () => {
  const [currentStepId, setCurrentStepId] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File }>({});
  const [capturedSelfie, setCapturedSelfie] = useState<Blob | null>(null);
  const { account } = useWallet();
  const { handleUploadDocument } = useContext<any>(StateContext);
  const router = useRouter();

  const handleFileUpload = (fileType: string, file: File) => {
    setUploadedFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  const handleSelfieCapture = (imageBlob: Blob) => {
    setCapturedSelfie(imageBlob);
  };

  const submitDocuments = async () => {
    if (!uploadedFiles['passport'] || !capturedSelfie) {
      console.error('Passport or selfie is missing.');
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('docName', 'passport');
      formData.append('image_file', uploadedFiles['passport']);
      formData.append('webcam_image', new File([capturedSelfie], 'selfie.jpg', { type: 'image/jpg' }));
  
      const encryptedBlob = await encryptFile(uploadedFiles['passport'], process.env.NEXT_PUBLIC_HASH_KEY as string);
  
      const formData2 = new FormData();
      formData2.append("file", encryptedBlob, "passport_" + account?.address);
  
      const res = await axios.post(process.env.NEXT_PUBLIC_PINATA_UPLOAD_URL as string, formData2, {
        headers: {
          "pinata_api_key": process.env.NEXT_PUBLIC_PINATA_API_KEY,
          "pinata_secret_api_key": process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
        },
      });
  
      if (res.data.IpfsHash) {
        await handleUploadDocument('passport', "", res.data.IpfsHash);
        router.push('/customer');
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
    
    }
    setUploadedFiles({});
    setCapturedSelfie(null);
    setCurrentStepId(1);
  };
  

  return (
    <CustomerLayout>
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className='grid md:grid-cols-2 gap-6 w-full'>
          <CameraCapture onCapture={handleSelfieCapture} />
          <DocumentUpload
            fileType='passport'
            onFileUpload={(file) => handleFileUpload('passport', file)}
          />
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex justify-between space-x-4">
            <Button onClick={submitDocuments}>Submit</Button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default Page;
