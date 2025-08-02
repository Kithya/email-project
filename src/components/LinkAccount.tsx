"use client";
import React from "react";
import { Button } from "./ui/button";
import { getAurinkoAuthUrl } from "~/lib/aurinko";

const LinkAccount = () => {
  return (
    <Button
      onClick={async () => {
        const authUrl = await getAurinkoAuthUrl("Google");
        window.location.href = authUrl;
        console.log(authUrl);
      }}
    >
      Link Account
    </Button>
  );
};

export default LinkAccount;
