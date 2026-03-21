import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { parseBody } from "next-sanity/webhook";

const secret = process.env.SANITY_WEBHOOK_SECRET;
const log = {
  info: (message: string, data?: any) => {
    console.log(
      `🔄 [REVALIDATION] ${message}`,
      data ? JSON.stringify(data, null, 2) : "",
    );
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [REVALIDATION] ${message}`, error);
  },
  success: (message: string, data?: any) => {
    console.log(
      `✅ [REVALIDATION] ${message}`,
      data ? JSON.stringify(data, null, 2) : "",
    );
  },
};

const REVALIDATION_MAP = {
  blogPost: {
    tags: ["blog-posts", "blog-categories"],
    paths: ["/blog", "/sitemap.xml"],
    specificTag: (slug: string) => `blog-post-${slug}`,
    specificPath: (slug: string) => `/blog/${slug}`,
  },
  legalPolicy: {
    tags: ["legal-policies"],
    paths: ["/sitemap.xml"],
    specificTag: (slug: string) => `legal-policy-${slug}`,
    specificPath: (slug: string) => `/legal/${slug}`,
  },
  category: {
    tags: ["blog-categories", "blog-posts"],
    paths: ["/blog"],
  },
  author: {
    tags: ["blog-posts"],
    paths: ["/blog"],
  },
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    log.info("Webhook received, starting processing...");

    // SIGNATURE VALIDATION
    const { body, isValidSignature } = await parseBody<{
      _type: string;
      _id: string;
      slug?: { current: string };
      title?: string;
    }>(req, secret);

    if (!isValidSignature) {
      log.error("Invalid signature detected");
      return NextResponse.json(
        {
          message: "Invalid signature",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    if (!body?._type) {
      log.error("Document type not found in body", { body });
      return NextResponse.json(
        {
          message: "Missing document type",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    log.info(`Processing document of type: ${body._type}`, {
      id: body._id,
      slug: body.slug?.current,
      title: body.title,
    });

    // TYPE-BASED REVALIDATION
    const config =
      REVALIDATION_MAP[body._type as keyof typeof REVALIDATION_MAP];

    if (!config) {
      log.error(`Unsupported document type: ${body._type}`);
      return NextResponse.json(
        {
          message: `Unsupported document type: ${body._type}`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const revalidatedItems: string[] = [];

    try {
      // REVALIDATE GENERAL TAGS
      for (const tag of config.tags) {
        revalidateTag(tag);

        revalidatedItems.push(`tag:${tag}`);
        log.info(`Revalidated tag: ${tag}`);
      }

      // REVALIDATE GENERAL PATHS
      for (const path of config.paths) {
        revalidatePath(path);
        revalidatedItems.push(`path:${path}`);

        log.info(`Path revalidated: ${path}`);
      }

      // ADDITIONAL REVALIDATION FOR SPECIAL CASES
      if (body._type === "blogPost") {
        // Also revalidate the homepage if it is a featured post
        revalidatePath("/");
        revalidatedItems.push("path:/");

        // Revalidate RSS feed if you have
        revalidatePath("/feed.xml");
        revalidatedItems.push("path:/feed.xml");
      }

      const processingTime = Date.now() - startTime;

      log.success(
        `Revalidation completed successfully on ${processingTime}ms`,
        {
          documentType: body._type,
          documentId: body._id,
          slug: body.slug?.current,
          revalidatedItems,
          processingTime,
        },
      );

      return NextResponse.json({
        message: `Successfully revalidated ${body._type}`,
        revalidated: true,
        items: revalidatedItems,
        processingTime,
        timestamp: new Date().toISOString(),
        documentInfo: {
          type: body._type,
          id: body._id,
          slug: body.slug?.current,
          title: body.title,
        },
      });
    } catch (revalidationError) {
      log.error("Error during revalidation process", revalidationError);

      // TRY EMERGENCY REVALIDATION
      try {
        log.info("Attempting emergency revalidation...");

        revalidateTag("all");
        revalidatePath("/blog");

        return NextResponse.json({
          message: "Partial revalidation completed (emergency mode)",
          revalidated: true,
          emergency: true,
          error:
            revalidationError instanceof Error
              ? revalidationError.message
              : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      } catch (emergencyError) {
        log.error("Emergency revalidation also failed", emergencyError);
        throw revalidationError; // Re-throw original error
      }
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    log.error("General error in webhook", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    });

    return NextResponse.json(
      {
        message: "Internal server error during revalidation",
        error: error instanceof Error ? error.message : "Unknown error",
        revalidated: false,
        processingTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// ENDPOINT DE HEALTH CHECK
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Revalidation webhook endpoint is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasSecret: !!secret,
  });
}
