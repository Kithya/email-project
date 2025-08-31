import { Pencil } from "lucide-react";
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import EmailEditor from "./email-editor";

const ComposeButton = () => {
  const [toValue, setToValue] = React.useState<
    { label: string; value: string }[]
  >([]);
  const [ccValues, setCcValue] = React.useState<
    { label: string; value: string }[]
  >([]);
  const [subject, setSubject] = React.useState<string>("");

  const handleSend = async (value: string) => {
    console.log("value", value);
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>
          <Pencil className="mr-1 size-4" />
          Compose
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Compose Email</DrawerTitle>
        </DrawerHeader>
        <EmailEditor
          toValues={toValue}
          setToValue={setToValue}
          ccValues={ccValues}
          setCcValue={setCcValue}
          subject={subject}
          setSubject={setSubject}
          handleSend={handleSend}
          isSending={false}
          to={toValue.map((to) => to.value)}
          defaultToolbarExpand={true}
        />
      </DrawerContent>
    </Drawer>
  );
};

export default ComposeButton;
