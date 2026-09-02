import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(
  request: Request
) {
  try {
    // ==========================================
    // GET AUTHORIZATION HEADER
    // ==========================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized request.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.replace(
        "Bearer ",
        ""
      );

    // ==========================================
    // VERIFY LOGGED-IN USER
    // ==========================================

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (userError || !user) {
      console.error(
        "User verification error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    // ==========================================
    // GET PROFILE
    // ==========================================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, role, employee_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Profile fetch error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify employee profile.",
        },
        {
          status: 500,
        }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Employee profile not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ==========================================
    // EMPLOYEE ONLY
    // ==========================================

    if (
      profile.role !== "employee"
    ) {
      return NextResponse.json(
        {
          error:
            "Only employee accounts can complete this action.",
        },
        {
          status: 403,
        }
      );
    }

    if (!profile.employee_id) {
      return NextResponse.json(
        {
          error:
            "No employee record is linked to this account.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // UPDATE PASSWORD CHANGE FLAG
    // ==========================================

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: false,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "Profile update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to complete password change.",
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return NextResponse.json({
      success: true,
      message:
        "Password change completed successfully.",
    });
  } catch (error) {
    console.error(
      "Complete password change API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while completing the password change.",
      },
      {
        status: 500,
      }
    );
  }
}