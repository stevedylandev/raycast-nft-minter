import { List, Icon, Clipboard, Toast, Form, ActionPanel, Action, showToast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import axios from "axios";
import formData from "form-data";
import fs from "fs";

interface Preferences {
  PINATA_JWT: string;
  GATEWAY: string;
  TATUM_KEY: string;
}

const preferences = getPreferenceValues<Preferences>();
const JWT = `Bearer ${preferences.PINATA_JWT}`;
const GATEWAY = `${preferences.GATEWAY}`
const TATUM_KEY = `${preferences.TATUM_KEY}`

type values = {
  file: string[];
  name: string;
  description: string;
  external_url: string;
  wallet: string;
};

function MintNFT({ loading, setLoading }) {
  async function handleSubmit(values: { file: string[]; name: string; description: string; external_url: string; wallet: string; }) {
    if (!values.file[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a file!",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading File..." });
    setLoading(true);

    try {
      const data = new formData();

      const file = fs.createReadStream(values.file[0]);

        data.append("file", file);
        const pinataMetadata = JSON.stringify({
          "name": `NFT ${values.name}`
        })
        data.append("pinataMetadata", pinataMetadata)

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": `multipart/form-data;`,
            Authorization: JWT,
          },
        });
        const uploadRes = res.data;
        const hash = uploadRes.IpfsHash;
        
        const metadata = JSON.stringify({
          "pinataContent": {
            "name": values.name,
            "description": values.description,
            "image": `ipfs://${hash}`,
            "external_url": values.external_url
          }
        })

        toast.style = Toast.Style.Animated;
        toast.title = "Uploading Metadata...";
        const jsonRes = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", metadata, {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": "application/json",
            Authorization: JWT
          },
        });
        const metadataHash = jsonRes.data.IpfsHash

        const mintData = JSON.stringify({
          "chain": "MATIC",
          "to": values.wallet,
          "url": `ipfs://${metadataHash}`
        })

        toast.style = Toast.Style.Animated;
        toast.title = "Minting NFT...";
        const mintRes = await axios.post("https://api.tatum.io/v3/nft/mint", mintData, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": TATUM_KEY
          }
        })
        console.log(mintRes.data)
        const tx = mintRes.data.txId
        await Clipboard.copy(`https://testnets.opensea.io/${values.wallet}`)
        
        toast.style = Toast.Style.Success;
        toast.title = "NFT Minted!";
        toast.message = String("Link copied to clipboard!");
        setLoading(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Mint NFT";
      toast.message = String(error);
      setLoading(false);
      console.log(error);
    }
  }
  return <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} icon={Icon.Upload} />;
}

export default function Command() {
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [externalUrlError, setExternalUrlError] = useState<string | undefined>();
  const [walletError, setWalletError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }
  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }
  function dropExternalUrlErrorIfNeeded() {
    if (externalUrlError && externalUrlError.length > 0) {
      setExternalUrlError(undefined);
    }
  }
  function dropWalletErrorIfNeeded() {
    if (walletError && walletError.length > 0) {
      setWalletError(undefined);
    }
  }

  return (
    <>
      <List>
        <List.EmptyView
          icon={{ source: "loading/loading.gif" }}
          title="Minting your NFT"
          description="This will take just a few moments!"
        />
      </List>
      {!loading && (
        <Form
          actions={
            <ActionPanel>
              <MintNFT loading={loading} setLoading={setLoading} />
            </ActionPanel>
          }
        >
          <Form.Description text="Mint an NFT!" />
          <Form.FilePicker id="file" allowMultipleSelection={false} />
          <Form.TextField 
            id="name" 
            title="Name" 
            placeholder="Choose the name for your NFT" 
            error={nameError}
            onBlur={(event) => {
              if (event.target.value?.length == 0){
                setNameError("This field shouldn't be empty!")
              } else {
                dropNameErrorIfNeeded()
              }
            }}
          />
          <Form.TextField 
            id="description" 
            title="Description" 
            placeholder="Describe your NFT" 
            error={descriptionError}
            onBlur={(event) => {
              if (event.target.value?.length == 0){
                setDescriptionError("This field shouldn't be empty!")
              } else {
                dropDescriptionErrorIfNeeded()
              }
            }}
          />
          <Form.TextField 
            id="external_url" 
            title="External URL" 
            placeholder="Provide a link to the NFT Project's website" 
            error={externalUrlError}
            onBlur={(event) => {
              if (event.target.value?.length == 0){
                setExternalUrlError("This field shouldn't be empty!")
              } else {
                dropExternalUrlErrorIfNeeded()
              }
            }}
          />
          <Form.TextField 
            id="wallet" 
            title="Destination Wallet" 
            placeholder="Provide the Polygon wallet you would like the NFT send to" 
            error={walletError}
            onBlur={(event) => {
              if (event.target.value?.length == 0){
                setWalletError("This field shouldn't be empty!")
              } else {
                dropWalletErrorIfNeeded()
              }
            }}
          />
          <Form.Separator />
        </Form>
      )}
    </>
  );
}

